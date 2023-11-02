import faker from "faker";
import { set } from "lodash";

import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("config", () => {
  it('does not soft delete models where config is passed as "false"', async () => {
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: {
        User: false,
      },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: {
        author: { delete: true },
        comments: {
          updateMany: {
            where: { content: faker.lorem.sentence() },
            data: { content: faker.lorem.sentence() },
          },
        },
      },
    });

    await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("allows setting default config values", async () => {
    const deletedAt = new Date();
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: {
        Post: true,
        Comment: true,
      },
      defaultConfig: {
        field: "deletedAt",
        createValue: () => deletedAt,
      },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        posts: {
          delete: { id: 1 },
        },
        comments: {
          updateMany: {
            where: { content: faker.lorem.sentence() },
            data: { content: faker.lorem.sentence() },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.data.posts", {
      update: { where: { id: 1 }, data: { deletedAt } },
    });
    set(params, "args.data.comments.updateMany.where.deletedAt", deletedAt);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it('throws when default config does not have a "field" property', () => {
    expect(() => {
      createSoftDeleteExtension({
        models: {
          Post: true,
        },
        // @ts-expect-error - we are testing the error case
        defaultConfig: {
          createValue: () => new Date(),
        },
      });
    }).toThrowError(
      "prisma-extension-soft-delete: defaultConfig.field is required"
    );
  });

  it('throws when default config does not have a "createValue" property', () => {
    expect(() => {
      createSoftDeleteExtension({
        models: {
          Post: true,
        },
        // @ts-expect-error - we are testing the error case
        defaultConfig: {
          field: "deletedAt",
        },
      });
    }).toThrowError(
      "prisma-extension-soft-delete: defaultConfig.createValue is required"
    );
  });

  it("allows setting model specific config values", async () => {
    const deletedAt = new Date();
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: {
        Post: {
          field: "deletedAt",
          createValue: () => deletedAt,
        },
        Comment: true,
      },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        posts: { delete: { id: 1 } },
        comments: {
          updateMany: {
            where: { content: faker.lorem.sentence() },
            data: { content: faker.lorem.sentence() },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.data.posts", {
      update: { where: { id: 1 }, data: { deletedAt } },
    });
    set(params, "args.data.comments.updateMany.where.deleted", false);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("allows overriding default config values", async () => {
    const deletedAt = new Date();
    const { $allOperations } = mockClient.$extends(createSoftDeleteExtension({
      models: {
        Post: true,
        Comment: {
          field: "deleted",
          createValue: Boolean,
        },
      },
      defaultConfig: {
        field: "deletedAt",
        createValue: (deleted) => {
          if (deleted) return deletedAt;
          return null;
        },
      },
    }));

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: {
        posts: { delete: { id: 1 } },
        comments: {
          updateMany: {
            where: { content: faker.lorem.sentence() },
            data: { content: faker.lorem.sentence() },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.data.posts", {
      update: { where: { id: 1 }, data: { deletedAt } },
    });
    set(params, "args.data.comments.updateMany.where.deleted", false);

    expect(query).toHaveBeenCalledWith(params.args);
  });
});
