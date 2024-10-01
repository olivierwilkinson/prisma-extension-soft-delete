import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("findFirstOrThrow", () => {
  it("does not change findFirstOrThrow params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.findFirstOrThrow({
      where: { id: 1 },
    });

    // params have not been modified
    expect(extendedClient.user.findFirstOrThrow.query).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("does not modify findFirstOrThrow results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    extendedClient.user.findFirstOrThrow.query.mockImplementation((() =>
      Promise.resolve({ id: 1, deleted: true })) as any);

    const result = await extendedClient.user.findFirstOrThrow({
      where: { id: 1 },
    });

    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("excludes deleted records from findFirstOrThrow", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findFirstOrThrow({
      where: { id: 1 },
    });

    // params have been modified
    expect(extendedClient.user.findFirstOrThrow.query).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findFirstOrThrow with no args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    await extendedClient.user.findFirstOrThrow(undefined);

    // params have been modified
    expect(extendedClient.user.findFirstOrThrow.query).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findFirstOrThrow with empty args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    await extendedClient.user.findFirstOrThrow({});

    // params have been modified
    expect(extendedClient.user.findFirstOrThrow.query).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("allows explicitly querying for deleted records using findFirstOrThrow", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findFirstOrThrow({
      where: { id: 1, deleted: true },
    });

    // params have not been modified
    expect(extendedClient.user.findFirstOrThrow.query).toHaveBeenCalledWith({
      where: { id: 1, deleted: true },
    });
  });
});
