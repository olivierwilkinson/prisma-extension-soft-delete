import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("deleteMany", () => {
  it("does not change deleteMany action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: { id: 1 },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not change nested deleteMany action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        posts: {
          deleteMany: {
            id: 1,
          },
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify deleteMany results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { count: 1 };
    const query = jest.fn(() => Promise.resolve(queryResult));
    mockClient.user.updateMany.mockImplementation(() => queryResult);

    const params = createParams(query, "User", "deleteMany", {
      where: { id: 1 },
    });

    const result = await $allOperations(params);
    expect(result).toEqual({ count: 1 });
  });

  it("changes deleteMany action into an updateMany that adds deleted mark", async () => {
    const client = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: { id: 1 },
    });
    await client.$allOperations(params);

    // params are modified correctly
    expect(mockClient.user.updateMany).toHaveBeenCalledWith({
      where: { ...params.args.where, deleted: false },
      data: { deleted: true },
    });
  });

  it("changes deleteMany action with no args into an updateMany that adds deleted mark", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", undefined);
    await $allOperations(params);

    // params are modified correctly
    expect(mockClient.user.updateMany).toHaveBeenCalledWith({
      where: { deleted: false },
      data: { deleted: true },
    });
  });

  it("changes deleteMany action with no where into an updateMany that adds deleted mark", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {});
    await $allOperations(params);

    // params are modified correctly
    expect(mockClient.user.updateMany).toHaveBeenCalledWith({
      where: { deleted: false },
      data: { deleted: true },
    });
  });

  it("changes nested deleteMany action into an updateMany that adds deleted mark", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Post: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        posts: {
          deleteMany: {
            id: 1,
          },
        },
      },
    });

    await $allOperations(params);

    // params are modified correctly
    expect(query).toHaveBeenCalledWith({
      ...params.args,
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
