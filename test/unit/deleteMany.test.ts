import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("deleteMany", () => {
  it("does not change deleteMany action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.deleteMany({
      where: { id: 1 },
    });

    // params have not been modified
    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("does not change nested deleteMany action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: {
        posts: {
          deleteMany: {
            id: 1,
          },
        },
      },
    });

    // params have not been modified
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        posts: {
          deleteMany: {
            id: 1,
          },
        },
      },
    });
  });

  it("does not modify deleteMany results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { count: 1 };
    client.user.updateMany.mockImplementation((() =>
      Promise.resolve(queryResult)) as any);

    const result = await extendedClient.user.deleteMany({
      where: { id: 1 },
    });

    expect(result).toEqual({ count: 1 });
  });

  it("changes deleteMany action into an updateMany that adds deleted mark", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.deleteMany({
      where: { id: 1 },
    });

    // params are modified correctly
    expect(client.user.updateMany).toHaveBeenCalledWith({
      where: { id: 1, deleted: false },
      data: { deleted: true },
    });
  });

  it("changes deleteMany action with no args into an updateMany that adds deleted mark", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.deleteMany(undefined);

    // params are modified correctly
    expect(client.user.updateMany).toHaveBeenCalledWith({
      where: { deleted: false },
      data: { deleted: true },
    });
  });

  it("changes deleteMany action with no where into an updateMany that adds deleted mark", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.deleteMany({});

    // params are modified correctly
    expect(client.user.updateMany).toHaveBeenCalledWith({
      where: { deleted: false },
      data: { deleted: true },
    });
  });

  it("changes nested deleteMany action into an updateMany that adds deleted mark", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Post: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: {
        posts: {
          deleteMany: {
            id: 1,
          },
        },
      },
    });

    // params are modified correctly
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        posts: {
          updateMany: {
            where: { id: 1, deleted: false },
            data: { deleted: true },
          },
        },
      },
    });
  });
});
