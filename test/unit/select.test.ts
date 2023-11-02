import { set } from "lodash";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("select", () => {
  it("does not change select params if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({ models: {} }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: { comments: true },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted records from selects", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { Comment: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: true,
      },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.select.comments", {
        where: {
          deleted: false,
        },
      }).args
    );
  });

  it("excludes deleted records from selects using where", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { Comment: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: {
            content: faker.lorem.sentence(),
          },
        },
      },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.select.comments.where.deleted", false).args
    );
  });

  it("excludes deleted records from include with select", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { Comment: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: {
          select: {
            id: true,
          },
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.include.comments", {
        where: { deleted: false },
        select: { id: true },
      }).args
    );
  });

  it("allows explicitly selecting deleted records using select", async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: { Comment: true },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      select: {
        comments: {
          where: {
            deleted: true,
          },
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });
});
