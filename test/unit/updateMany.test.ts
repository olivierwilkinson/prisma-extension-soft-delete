import { set } from "lodash";
import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("updateMany", () => {
  it("does not change updateMany action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "updateMany", {
      where: { id: { in: [1, 2] } },
      data: { email: "test@test.com" },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify updateMany results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({ count: 1 }));
    const params = createParams(query, "User", "updateMany", {
      where: { id: 1 },
      data: { name: "John" },
    });

    const result = await $allOperations(params);

    expect(result).toEqual({ count: 1 });
  });

  it("does not change updateMany action if args not passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error - args are required
    const params = createParams(query, "User", "updateMany", undefined);

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted records from root updateMany action", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "updateMany", {
      where: { id: 1 },
      data: { email: "test@test.com" },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith({
      ...params.args,
      where: {
        ...params.args.where,
        deleted: false,
      },
    });
  });

  it("excludes deleted records from root updateMany action when where not passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "updateMany", {
      data: { name: "John" },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith({
      ...params.args,
      where: {
        ...params.args.where,
        deleted: false,
      },
    });
  });

  it("excludes deleted record from nested updateMany action", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
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

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.data.comments.updateMany.where.deleted", false).args
    );
  });

  it("allows explicitly updating deleted records", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          User: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "updateMany", {
      where: { id: { in: [1, 2] }, deleted: true },
      data: { email: "test@test.com" },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("allows explicitly updating deleted records when using custom deletedAt field", async () => {
    const { $allOperations } = mockClient.$extends(
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

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "updateMany", {
      where: { id: { in: [1, 2] }, deletedAt: { not: null } },
      data: { email: "test@test.com" },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
