import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("findFirst", () => {
  it("does not change findFirst params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.findFirst({
      where: { id: 1 },
    });

    // params have not been modified
    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("does not modify findFirst results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    extendedClient.user.findFirst.query.mockImplementation((() =>
      Promise.resolve({
        id: 1,
        deleted: true,
      })) as any);

    const result = await extendedClient.user.findFirst({
      where: { id: 1 },
    });

    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("excludes deleted records from findFirst", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findFirst({
      where: { id: 1 },
    });

    // params have been modified
    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findFirst with no args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    await extendedClient.user.findFirst(undefined);

    // params have been modified
    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findFirst with empty args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    await extendedClient.user.findFirst({});

    // params have been modified
    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("allows explicitly querying for deleted records using findFirst", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findFirst({
      where: { id: 1, deleted: true },
    });

    // params have not been modified
    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: true,
      },
    });
  });
});
