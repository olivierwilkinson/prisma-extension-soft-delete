import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("upsert", () => {
  it("does not modify upsert results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    client.user.upsert.mockImplementation(
      () =>
        Promise.resolve({ id: 1, name: "John", email: "John@test.com" }) as any
    );
    const result = await extendedClient.user.upsert({
      where: { id: 1 },
      create: { name: "John", email: "John@test.com" },
      update: { name: "John" },
    });

    expect(result).toEqual({
      id: 1,
      name: "John",
      email: "John@test.com",
    });
  });

  it("does nothing to root upsert action", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.upsert({
      where: { id: 1 },
      create: { name: "John", email: "john@test.com" },
      update: { name: "John" },
    });

    expect(client.user.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { name: "John", email: "john@test.com" },
      update: { name: "John" },
    });
  });

  it("does nothing to nested toMany upsert actions", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.post.update({
      where: { id: 1 },
      data: {
        comments: {
          upsert: {
            where: { id: 1 },
            create: { content: "Hello", authorId: 1 },
            update: { content: "Hello" },
          },
        },
      },
    });

    expect(client.post.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        comments: {
          upsert: {
            where: { id: 1 },
            create: { content: "Hello", authorId: 1 },
            update: { content: "Hello" },
          },
        },
      },
    });
  });

  it("throws when trying to upsert a model configured for soft delete through a toOne relation", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await expect(
      extendedClient.post.update({
        where: { id: 1 },
        data: {
          author: {
            upsert: {
              create: {
                name: "test",
                email: "test@test.com",
              },
              update: {
                email: "test@test.com",
              },
            },
          },
        },
      })
    ).rejects.toThrowError(
      'prisma-extension-soft-delete: upsert of model "User" through "Post.author" found. Upserts of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.'
    );
  });
});
