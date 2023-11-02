import { set } from "lodash";

import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("aggregate", () => {
  it("does not change aggregate action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "aggregate", {
      where: { email: { contains: "test" } },
      _sum: { id: true },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted records from aggregate with no where", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          User: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "aggregate", {});

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.where.deleted", false).args
    );
  });

  it("excludes deleted record from aggregate with where", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          User: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "aggregate", {
      where: { email: { contains: "test" } },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.where.deleted", false).args
    );
  });
});
