import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("findUniqueOrThrow", () => {
  it("does not change findUniqueOrThrow params if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findUniqueOrThrow", {
      where: { id: 1 },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify findUniqueOrThrow results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { id: 1, deleted: true };
    const query = jest.fn(() => Promise.resolve(queryResult));
    mockClient.user.findFirstOrThrow.mockImplementation(() => queryResult);

    const params = createParams(query, "User", "findUniqueOrThrow", {
      where: { id: 1 },
    });

    const result = await $allOperations(params);

    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("changes findUniqueOrThrow into findFirstOrThrow and excludes deleted records", async () => {
    const client = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findUniqueOrThrow", {
      where: { id: 1 },
    });

    await client.$allOperations(params);

    // params have been modified
    expect(mockClient.user.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
    
    // query has not been called
    expect(query).not.toHaveBeenCalled();
  });

  it("does not modify findUniqueOrThrow to be a findFirstOrThrow when no args passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error testing if user doesn't pass args accidentally
    const params = createParams(query, "User", "findUniqueOrThrow", undefined);

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify findUniqueOrThrow to be a findFirst when invalid where passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    let query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error testing if user doesn't pass where accidentally
    let params = createParams(query, "User", "findUniqueOrThrow", {});
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect empty where not to modify params
    query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error testing if user passes where without unique field
    params = createParams(query, "User", "findUniqueOrThrow", { where: {} });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with undefined id field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUniqueOrThrow", {
      where: { id: undefined },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with undefined unique field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUniqueOrThrow", {
      where: { email: undefined },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with undefined unique index field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUniqueOrThrow", {
      where: { name_email: undefined },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with defined non-unique field
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUniqueOrThrow", {
      // @ts-expect-error intentionally incorrect where
      where: { name: "test" },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with defined non-unique field and undefined id field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUniqueOrThrow", {
      where: { id: undefined, name: "test" },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
