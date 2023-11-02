import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("update", () => {
  it("does not change update action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: {} }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify update results", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: { User: true } }));

    const query = jest.fn(() => Promise.resolve({ id: 1, name: "John" }));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { name: "John" },
    });
    
    const result = await $allOperations(params);

    expect(result).toEqual({ id: 1, name: "John" });
  });

  it("throws when trying to update a model configured for soft delete through a toOne relation", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = () => Promise.resolve({});
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: {
        author: {
          update: {
            email: "test@test.com",
          },
        },
      },
    });

    await expect($allOperations(params)).rejects.toThrowError(
      'prisma-extension-soft-delete: update of model "User" through "Post.author" found. Updates of soft deleted models through a toOne relation is not supported as it is possible to update a soft deleted record.'
    );
  });

  it("does nothing to nested update actions for toOne relations when allowToOneUpdates is true", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
      defaultConfig: {
        field: "deleted",
        createValue: Boolean,
        allowToOneUpdates: true,
      },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: {
        author: {
          update: {
            email: "blah",
          },
        },
      },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does nothing to nested update actions for toMany relations", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: {
        comments: {
          update: {
            where: {
              id: 2,
            },
            data: {
              content: "content",
            },
          },
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify update when no args are passed", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: { User: true } }));

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error - args are required
    const params = createParams(query, "User", "update", undefined);

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify update when no where is passed", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: { User: true } }));

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error - where is required
    const params = createParams(query, "User", "update", {});

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
