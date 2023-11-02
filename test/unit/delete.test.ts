import { set } from "lodash";
import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("delete", () => {
  it("does not change delete action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "delete", { where: { id: 1 } });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not change nested delete action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        posts: {
          delete: { id: 1 },
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify delete results", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );
    
    const queryResult = { id: 1, deleted: true };
    const query = jest.fn(() => Promise.resolve(queryResult));
    mockClient.user.update.mockImplementation(() => queryResult);

    const params = createParams(query, "User", "delete", { where: { id: 1 } });

    const result = await $allOperations(params);
    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("does not modify delete with no args", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error - args are required
    const params = createParams(query, "User", "delete", undefined);

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("does not modify delete with no where", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const query = jest.fn(() => Promise.resolve({}));
    // @ts-expect-error - where is required
    const params = createParams(query, "User", "delete", {});

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("changes delete action into an update to add deleted mark", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve());
    const params = createParams(query, "User", "delete", { where: { id: 1 } });
    await $allOperations(params);

    // params are modified correctly
    expect(mockClient.user.update).toHaveBeenCalledWith({
      ...params.args,
      data: { deleted: true },
    });
    
    expect(query).not.toHaveBeenCalled();
  });

  it("does not change nested delete false action", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Profile: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        profile: { delete: false },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("changes nested delete true action into an update that adds deleted mark", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Profile: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        profile: {
          delete: true,
        },
      },
    });

    await $allOperations(params);

    // params are modified correctly
    expect(query).toHaveBeenCalledWith(
      set(params, "args.data.profile", {
        update: { deleted: true },
      }).args
    );
  });

  it("changes nested delete action on a toMany relation into an update that adds deleted mark", async () => {
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
          delete: { id: 1 },
        },
      },
    });

    await $allOperations(params);

    // params are modified correctly
    expect(query).toHaveBeenCalledWith({
      ...params.args,
      data: {
        posts: {
          update: {
            where: { id: 1 },
            data: { deleted: true },
          },
        },
      },
    });
  });

  it("changes nested list of delete actions into a nested list of update actions", async () => {
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
          delete: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
      },
    });

    await $allOperations(params);

    // params are modified correctly
    expect(query).toHaveBeenCalledWith({
      ...params.args,
      data: {
        posts: {
          update: [
            { where: { id: 1 }, data: { deleted: true } },
            { where: { id: 2 }, data: { deleted: true } },
            { where: { id: 3 }, data: { deleted: true } },
          ],
        },
      },
    });
  });
});
