import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("groupBy", () => {
  //group by must always have by and order by, else we get an error,
  it("does not change groupBy action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "groupBy", {
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });
    await $allOperations(params);
    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify groupBy results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );
    const query = jest.fn(() => Promise.resolve([{ id: 1, deleted: true }]));
    const params = createParams(query, "User", "groupBy", {
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });
    const result = await $allOperations(params);
    expect(result).toEqual([{ id: 1, deleted: true }]);
  });

  it("excludes deleted records from groupBy", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "groupBy", {
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith({
      by: ["id"],
      orderBy: {},
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("allows explicitly querying for deleted records using groupBy", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "groupBy", {
      where: { id: 1, deleted: true },
      by: ["id"],
      orderBy: {},
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
