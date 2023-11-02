import { set } from "lodash";
import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("count", () => {
  it("does not change count action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: {} }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "count", {});

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted records from count", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "count", undefined);

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(set(params, "args.where.deleted", false).args);
  });

  it("excludes deleted records from count with empty args", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "count", {});

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(set(params, "args.where.deleted", false).args);
  });

  it("excludes deleted record from count with where", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { User: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "count", {
      where: { email: { contains: "test" } },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(set(params, "args.where.deleted", false).args);
  });
});
