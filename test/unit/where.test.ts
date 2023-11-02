import faker from "faker";
import { set } from "lodash";

import { createSoftDeleteExtension } from "../../src";
import { createParams } from "./utils/createParams";
import mockClient from "./utils/mockClient";

describe("where", () => {
  it("does not change where action if model is not in the list", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: {
        email: faker.internet.email(),
        comments: {
          some: {
            content: faker.lorem.sentence(),
          },
        },
      },
    });

    await $allOperations(params);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("changes root where correctly when model is nested", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: {
        email: faker.internet.email(),
        comments: {
          some: {
            AND: [
              { createdAt: { gt: faker.date.past() } },
              { createdAt: { lt: faker.date.future() } },
            ],
            OR: [
              { post: { content: faker.lorem.sentence() } },
              { post: { content: faker.lorem.sentence() } },
            ],
            NOT: { post: { is: { authorName: faker.name.findName() } } },
            content: faker.lorem.sentence(),
            post: {
              isNot: {
                content: faker.lorem.sentence(),
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.where.comments.some.deleted", false);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("handles where with modifiers correctly", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Post: true, Comment: true, User: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "Comment", "findMany", {
      where: {
        content: faker.lorem.sentence(),
        post: {
          is: {
            content: "foo",
          },
        },
        author: {
          isNot: {
            name: "Jack",
          },
        },
        replies: {
          some: {
            content: "foo",
          },
          every: {
            content: "bar",
          },
          none: {
            content: "baz",
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.where.deleted", false);
    set(params, "args.where.post.is.deleted", false);
    set(params, "args.where.author.isNot.deleted", false);
    set(params, "args.where.replies.some.deleted", false);
    set(params, "args.where.replies.every", {
      OR: [{ deleted: { not: false } }, params.args.where.replies.every],
    });
    set(params, "args.where.replies.none.deleted", false);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("changes root where correctly when model is deeply nested", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: { Post: true },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: {
        email: faker.internet.email(),
        comments: {
          some: {
            AND: [
              { createdAt: { gt: faker.date.past() } },
              { post: { content: faker.lorem.sentence() } },
            ],
            OR: [
              { post: { content: faker.lorem.sentence() } },
              { createdAt: { lt: faker.date.future() } },
            ],
            NOT: {
              post: {
                is: {
                  authorName: faker.name.findName(),
                },
              },
            },
            post: {
              isNot: {
                content: faker.lorem.sentence(),
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.where.comments.some.AND.1.post.deleted", false);
    set(params, "args.where.comments.some.OR.0.post.deleted", false);
    set(params, "args.where.comments.some.NOT.post.is.deleted", false);
    set(params, "args.where.comments.some.post.isNot.deleted", false);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("change root where correctly when multiple models passed", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: {
        email: faker.internet.email(),
        comments: {
          some: {
            AND: [
              { createdAt: { gt: faker.date.past() } },
              { createdAt: { lt: faker.date.future() } },
            ],
            OR: [
              { post: { content: faker.lorem.sentence() } },
              { post: { content: faker.lorem.sentence() } },
            ],
            NOT: { post: { is: { authorName: faker.name.findName() } } },
            content: faker.lorem.sentence(),
            post: {
              isNot: {
                content: faker.lorem.sentence(),
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.where.comments.some.deleted", false);
    set(params, "args.where.comments.some.NOT.post.is.deleted", false);
    set(params, "args.where.comments.some.OR.0.post.deleted", false);
    set(params, "args.where.comments.some.OR.1.post.deleted", false);
    set(params, "args.where.comments.some.post.isNot.deleted", false);

    // params have not been modified
    expect(query).toHaveBeenCalledWith(
      set(params, "args.where.comments.some.deleted", false).args
    );
  });

  it("allows checking for deleted records explicitly", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "deleteMany", {
      where: {
        email: faker.internet.email(),
        comments: {
          some: {
            deleted: true,
            AND: [
              { createdAt: { gt: faker.date.past() } },
              { createdAt: { lt: faker.date.future() } },
            ],
            OR: [
              { post: { deleted: true, content: faker.lorem.sentence() } },
              { post: { content: faker.lorem.sentence() } },
            ],
            NOT: {
              post: {
                is: { deleted: true, authorName: faker.name.findName() },
              },
            },
            content: faker.lorem.sentence(),
            post: {
              isNot: {
                content: faker.lorem.sentence(),
              },
            },
            replies: {
              some: {
                content: "foo",
                deleted: true,
              },
              every: {
                content: "bar",
                deleted: true,
              },
              none: {
                content: "baz",
                deleted: true,
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.where.comments.some.deleted", true);
    set(params, "args.where.comments.some.OR.0.post.deleted", true);
    set(params, "args.where.comments.some.OR.1.post.deleted", false);
    set(params, "args.where.comments.some.NOT.post.is.deleted", true);
    set(params, "args.where.comments.some.post.isNot.deleted", false);
    set(params, "args.where.comments.some.replies.some.deleted", true);
    set(params, "args.where.comments.some.replies.every.deleted", true);
    set(params, "args.where.comments.some.replies.none.deleted", true);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted from include where with nested relations", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findMany", {
      include: {
        posts: {
          where: {
            comments: {
              some: {
                content: faker.lorem.sentence(),
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.include.posts.where.comments.some.deleted", false);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted from select where with nested relations", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findMany", {
      select: {
        posts: {
          where: {
            comments: {
              some: {
                content: faker.lorem.sentence(),
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.select.posts.where.comments.some.deleted", false);

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted from include where with nested relations and multiple models", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findMany", {
      include: {
        comments: {
          where: {
            post: {
              content: faker.lorem.sentence(),
              comments: {
                some: {
                  content: faker.lorem.sentence(),
                },
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.include.comments.where.deleted", false);
    set(params, "args.include.comments.where.post.deleted", false);
    set(
      params,
      "args.include.comments.where.post.comments.some.deleted",
      false
    );

    expect(query).toHaveBeenCalledWith(params.args);
  });

  it("excludes deleted from select where with nested relations and multiple models", async () => {
    const { $allOperations } = mockClient.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    const query = jest.fn(() => Promise.resolve({}));
    const params = createParams(query, "User", "findMany", {
      select: {
        comments: {
          where: {
            post: {
              content: faker.lorem.sentence(),
              comments: {
                some: {
                  content: faker.lorem.sentence(),
                },
              },
            },
          },
        },
      },
    });

    await $allOperations(params);

    set(params, "args.select.comments.where.deleted", false);
    set(params, "args.select.comments.where.post.deleted", false);
    set(params, "args.select.comments.where.post.comments.some.deleted", false);

    expect(query).toHaveBeenCalledWith(params.args);
  });
});
