import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("delete", () => {
  it("does not change delete action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.delete({ where: { id: 1 } });

    // params have not been modified
    expect(client.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("does not change nested delete action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: {
        posts: {
          delete: { id: 1 },
        },
      },
    });

    // params have not been modified
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        posts: {
          delete: { id: 1 },
        },
      },
    });
  });

  it("does not modify delete results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { id: 1, deleted: true };
    client.user.update.mockImplementation((() =>
      Promise.resolve(queryResult)) as any);

    const result = await extendedClient.user.delete({ where: { id: 1 } });
    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("does not modify delete with no args", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    client.user.delete.mockImplementation((() => Promise.resolve({})) as any);
    // @ts-expect-error - args are required
    await extendedClient.user.delete(undefined);

    // params have not been modified
    expect(client.user.delete).toHaveBeenCalledWith(undefined);
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it("does not modify delete with no where", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    // @ts-expect-error - where is required
    await extendedClient.user.delete({});

    // params have not been modified
    expect(client.user.delete).toHaveBeenCalledWith({});
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it("changes delete action into an update to add deleted mark", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.delete({ where: { id: 1 } });

    // params are modified correctly
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deleted: true },
    });
  });

  it("does not change nested delete false action", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Profile: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: {
        profile: { delete: false },
      },
    });

    // params have not been modified
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        profile: { delete: false },
      },
    });
  });

  it("changes nested delete true action into an update that adds deleted mark", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Profile: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: {
        profile: { delete: true },
      },
    });

    // params are modified correctly
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        profile: { update: { deleted: true } },
      },
    });
  });

  it("changes nested delete action on a toMany relation into an update that adds deleted mark", async () => {
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
          delete: { id: 1 },
        },
      },
    });

    // params are modified correctly
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        posts: {
          update: {
            where: { id: 1 },
            data: { deleted: true },
          },
        },
      },
    });
  });

  it("changes nested list of delete actions into a nested list of update actions", async () => {
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
          delete: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
      },
    });

    // params are modified correctly
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        posts: {
          update: [
            { where: { id: 1 }, data: { deleted: true } },
            { where: { id: 2 }, data: { deleted: true } },
            { where: { id: 3 }, data: { deleted: true } },
          ],
        },
      },
    });
  });
});
