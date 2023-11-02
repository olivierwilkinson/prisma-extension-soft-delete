import { set } from "lodash";
import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("include", () => {
  it("does not change include params if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: { comments: true },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("uses params to exclude deleted records from toMany includes", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: true,
      },
    });

    await $allOperations(params);

    // params have been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.include.comments", {
        where: {
          deleted: false,
        },
      }).args
    );
  });

  it("uses params to exclude deleted records from toMany includes with where", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
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
      set(params, "args.include.comments.where.deleted", false).args
    );
  });

  it("manually excludes deleted records from boolean toOne include", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({ author: { deleted: true } }));
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: true,
      },
    });

    const result = await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
    expect(result).toEqual({ author: null });
  });

  it("does not manually exclude non-deleted records from boolean toOne include", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() =>
      Promise.resolve({ author: { deleted: false } })
    );
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: true,
      },
    });

    const result = await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
    expect(result).toEqual({ author: { deleted: false } });
  });

  it("manually excludes deleted records from toOne include with nested includes", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() =>
      Promise.resolve({ author: { deleted: true, comments: [] } })
    );
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: {
          include: {
            comments: true,
          },
        },
      },
    });

    const result = await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
    expect(result).toEqual({ author: null });
  });

  it("does not manually exclude non-deleted records from toOne include with nested includes", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() =>
      Promise.resolve({
        author: {
          deleted: false,
          comments: [],
        },
      })
    );
    const params = createParams(query, "Post", "update", {
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: {
          include: {
            comments: true,
          },
        },
      },
    });

    const result = await $allOperations(params);

    expect(result).toEqual({
      author: {
        deleted: false,
        comments: [],
      },
    });
  });

  it("excludes deleted records from toMany include nested in toMany include", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const query = jest.fn(() =>
      Promise.resolve({
        posts: [
          {
            comments: [{ deleted: true }, { deleted: false }],
          },
          {
            comments: [
              { deleted: false },
              { deleted: false },
              { deleted: true },
            ],
          },
        ],
      })
    );
    const params = createParams(query, "User", "findFirst", {
      where: { id: 1 },
      include: {
        posts: {
          include: {
            comments: true,
          },
        },
      },
    });

    const result = await $allOperations(params);

    expect(query).toHaveBeenCalledWith(
      set(params, "args.include.posts.include.comments", {
        where: {
          deleted: false,
        },
      }).args
    );
    expect(result).toEqual({
      posts: [
        { comments: [{ deleted: false }] },
        { comments: [{ deleted: false }, { deleted: false }] },
      ],
    });
  });

  it("manually excludes deleted records from toOne include nested in toMany include", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    const query = jest.fn(() =>
      Promise.resolve({
        posts: [
          { author: null },
          { author: { deleted: true } },
          { author: { deleted: false } },
        ],
      })
    );
    const params = createParams(query, "User", "findFirst", {
      where: { id: 1, deleted: false },
      include: {
        posts: {
          include: {
            author: true,
          },
        },
      },
    });

    const result = await $allOperations(params);

    expect(query).toHaveBeenCalledWith(params.args);
    expect(result).toEqual({
      posts: [
        { author: null },
        { author: null },
        { author: { deleted: false } },
      ],
    });
  });

  it("allows explicitly including deleted records using include", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const query = jest.fn(() =>
      Promise.resolve({
        comments: [{ deleted: true }, { deleted: true }],
      })
    );
    const params = createParams(query, "User", "update", {
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: {
          where: {
            deleted: true,
          },
        },
      },
    });

    const result = await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
    expect(result).toEqual({
      comments: [{ deleted: true }, { deleted: true }],
    });
  });
});
