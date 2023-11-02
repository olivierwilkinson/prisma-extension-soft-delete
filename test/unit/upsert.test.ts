import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("upsert", () => {
  it("does not modify upsert results", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: { User: true } }));

    const query = jest.fn(() =>
      Promise.resolve({ id: 1, name: "John", email: "John@test.com" })
    );
    const params = createParams(query, "User", "upsert", {
      where: { id: 1 },
      create: { name: "John", email: "John@test.com" },
      update: { name: "John" },
    });

    const result = await $allOperations(params);
    expect(result).toEqual({
      id: 1,
      name: "John",
      email: "John@test.com",
    });
  });

  it("does nothing to root upsert action", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "upsert", {
      where: { id: 1 },
      create: { name: "John", email: "john@test.com" },
      update: { name: "John" },
    });

    await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does nothing to nested toMany upsert actions", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "Post", "update", {
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

    await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("throws when trying to upsert a model configured for soft delete through a toOne relation", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = () => Promise.resolve({});
    const params = createParams(query, "Post", "update", {
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
    });


    await expect($allOperations(params)).rejects.toThrowError(
      'prisma-extension-soft-delete: upsert of model "User" through "Post.author" found. Upserts of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.'
    );
  });
});
