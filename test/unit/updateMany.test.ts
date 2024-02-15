import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("updateMany", () => {
  it("does not change updateMany action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.updateMany({
      where: { id: { in: [1, 2] } },
      data: { email: "test@test.com" },
    });

    // params have not been modified
    expect(client.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { email: "test@test.com" },
    });
  });

  it("does not modify updateMany results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    client.user.updateMany.mockImplementation(
      () => Promise.resolve({ count: 1 }) as any
    );

    const result = await extendedClient.user.updateMany({
      where: { id: 1 },
      data: { name: "John" },
    });

    expect(result).toEqual({ count: 1 });
  });

  it("does not change updateMany action if args not passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    // @ts-expect-error - args are required
    await extendedClient.user.updateMany(undefined);

    // params have not been modified
    expect(client.user.updateMany).toHaveBeenCalledWith(undefined);
  });

  it("excludes deleted records from root updateMany action", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.updateMany({
      where: { id: 1 },
      data: { email: "test@test.com" },
    });

    // params have been modified
    expect(client.user.updateMany).toHaveBeenCalledWith({
      data: { email: "test@test.com" },
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("excludes deleted records from root updateMany action when where not passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.updateMany({
      data: { name: "John" },
    });

    // params have been modified
    expect(client.user.updateMany).toHaveBeenCalledWith({
      data: { name: "John" },
      where: {
        deleted: false,
      },
    });
  });

  it("excludes deleted record from nested updateMany action", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: {
        comments: {
          updateMany: {
            where: {
              content: "foo",
              OR: [{ authorId: 1 }, { authorId: 2 }],
              AND: [
                { createdAt: { gt: new Date() } },
                { createdAt: { lt: new Date() } },
              ],
              NOT: { content: "bar" },
            },
            data: { content: "bar" },
          },
        },
      },
    });

    // params have been modified
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        comments: {
          updateMany: {
            where: {
              deleted: false,
              content: "foo",
              OR: [{ authorId: 1 }, { authorId: 2 }],
              AND: [
                { createdAt: { gt: expect.any(Date) } },
                { createdAt: { lt: expect.any(Date) } },
              ],
              NOT: { content: "bar" },
            },
            data: { content: "bar" },
          },
        },
      },
    });
  });

  it("allows explicitly updating deleted records", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          User: true,
        },
      })
    );

    await extendedClient.user.updateMany({
      where: { id: { in: [1, 2] }, deleted: true },
      data: { email: "test@test.com" },
    });

    // params have not been modified
    expect(client.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, deleted: true },
      data: { email: "test@test.com" },
    });
  });

  it("allows explicitly updating deleted records when using custom deletedAt field", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          User: {
            field: "deletedAt",
            createValue: (deleted) => {
              if (deleted) return new Date();
              return null;
            },
          },
        },
      })
    );

    await extendedClient.user.updateMany({
      where: { id: { in: [1, 2] }, deletedAt: { not: null } },
      data: { email: "test@test.com" },
    });

    // params have not been modified
    expect(client.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, deletedAt: { not: null } },
      data: { email: "test@test.com" },
    });
  });
});
