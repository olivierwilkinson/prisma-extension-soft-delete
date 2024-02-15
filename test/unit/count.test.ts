import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("count", () => {
  it("does not change count action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.count({});

    // params have not been modified
    expect(client.user.count).toHaveBeenCalledWith({});
  });

  it("excludes deleted records from count", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.count(undefined);

    // params have been modified
    expect(client.user.count).toHaveBeenCalledWith({ where: { deleted: false } });
  });

  it("excludes deleted records from count with empty args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.count({});

    // params have been modified
    expect(client.user.count).toHaveBeenCalledWith({
      where: { deleted: false },
    });
  });

  it("excludes deleted record from count with where", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.count({
      where: { email: { contains: "test" } },
    });

    // params have been modified
    expect(client.user.count).toHaveBeenCalledWith({
      where: { email: { contains: "test" }, deleted: false },
    });
  });
});
