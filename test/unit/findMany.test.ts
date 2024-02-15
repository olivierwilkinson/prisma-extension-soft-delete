import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("findMany", () => {
  it("does not change findMany params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.findMany({
      where: { id: 1 },
    });

    // params have not been modified
    expect(client.user.findMany).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("does not modify findMany results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    client.user.findMany.mockImplementation((() =>
      Promise.resolve([{ id: 1, deleted: true }])) as any);

    const result = await extendedClient.user.findMany({
      where: { id: 1 },
    });

    expect(result).toEqual([{ id: 1, deleted: true }]);
  });

  it("excludes deleted records from findMany", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findMany({
      where: { id: 1 },
    });

    // params have been modified
    expect(client.user.findMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findMany with no args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findMany(undefined);

    // params have been modified
    expect(client.user.findMany).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findMany with empty args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findMany({});

    // params have been modified
    expect(client.user.findMany).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("allows explicitly querying for deleted records using findMany", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findMany({
      where: { id: 1, deleted: true },
    });

    // params have not been modified
    expect(client.user.findMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: true,
      },
    });
  });
});
