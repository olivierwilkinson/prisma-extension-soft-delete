import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("findFirst", () => {
  it("does not change findFirst params if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findFirst", {
      where: { id: 1 },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify findFirst results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({ id: 1, deleted: true }));
    const params = createParams(query, "User", "findFirst", {
      where: { id: 1 },
    });

    const result = await $allOperations(params);

    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("excludes deleted records from findFirst", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findFirst", {
      where: { id: 1 },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findFirst with no args", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findFirst", undefined);

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("excludes deleted records from findFirst with empty args", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findFirst", {});

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith({
      where: {
        deleted: false,
      },
    });
  });

  it("allows explicitly querying for deleted records using findFirst", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findFirst", {
      where: { id: 1, deleted: true },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
