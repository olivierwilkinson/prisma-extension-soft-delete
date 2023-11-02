import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("findUnique", () => {
  it("does not change findUnique params if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findUnique", {
      where: { id: 1 },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify findUnique results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { id: 1, deleted: true };
    const query = jest.fn(() => Promise.resolve(queryResult));
    mockClient.user.findFirst.mockImplementation(() => queryResult);

    const params = createParams(query, "User", "findUnique", {
      where: { id: 1 },
    });

    const result = await $allOperations(params);
    expect(result).toEqual(queryResult);
  });

  it("changes findUnique into findFirst and excludes deleted records", async () => {
    const client = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findUnique", {
      where: { id: 1 },
    });

    await client.$allOperations(params);

    // params have been modified
    expect(mockClient.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
    
    expect(query).not.toHaveBeenCalled();
  });

  it("throws when trying to pass a findUnique where with a compound unique index field", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = () => Promise.resolve({});
    const params = createParams(query, "User", "findUnique", {
      where: {
        name_email: {
          name: "test",
          email: "test@test.com",
        },
      },
    });

    await expect($allOperations(params)).rejects.toThrowError(
      `prisma-extension-soft-delete: query of model "User" through compound unique index field "name_email" found. Queries of soft deleted models through a unique index are not supported. Set "allowCompoundUniqueIndexWhere" to true to override this behaviour.`
    );
  });

  it('does not modify findUnique when compound unique index field used and "allowCompoundUniqueIndexWhere" is set to true', async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          User: {
            field: "deleted",
            createValue: Boolean,
            allowCompoundUniqueIndexWhere: true,
          },
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findUnique", {
      where: {
        name_email: {
          name: "test",
          email: "test@test.com",
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify findUnique to be a findFirst when no args passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error testing if user doesn't pass args accidentally
    const params = createParams(query, "User", "findUnique", undefined);

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify findUnique to be a findFirst when invalid where passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    let query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error testing if user doesn't pass where accidentally
    let params = createParams(query, "User", "findUnique", {});
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect empty where not to modify params
    query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error testing if user passes where without unique field
    params = createParams(query, "User", "findUnique", { where: {} });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with undefined id field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUnique", {
      where: { id: undefined },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with undefined unique field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUnique", {
      where: { email: undefined },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with undefined unique index field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUnique", {
      where: { name_email: undefined },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with defined non-unique field
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUnique", {
      // @ts-expect-error intentionally incorrect where
      where: { name: "test" },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);

    // expect where with defined non-unique field and undefined id field not to modify params
    query = jest.fn(() => Promise.resolve({}));
    params = createParams(query, "User", "findUnique", {
      where: { id: undefined, name: "test" },
    });
    await $allOperations(params);
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
