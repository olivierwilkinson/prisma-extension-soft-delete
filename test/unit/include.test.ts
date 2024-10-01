import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("include", () => {
  it("does not change include params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: { comments: true },
    });

    // params have not been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: { comments: true },
    });
  });

  it("uses params to exclude deleted records from toMany includes", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    await extendedClient.user.update({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: true,
      },
    });

    // params have been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: {
          where: {
            deleted: false,
          },
        },
      },
    });
  });

  it("uses params to exclude deleted records from toMany includes with where", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    await extendedClient.user.update({
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

    // params have been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: "test@test.com" },
      include: {
        comments: {
          where: {
            content: expect.any(String),
            deleted: false,
          },
        },
      },
    });
  });

  it("manually excludes deleted records from boolean toOne include", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    extendedClient.post.update.query.mockImplementation(
      () => Promise.resolve({ author: { deleted: true } }) as any
    );

    const result = await extendedClient.post.update({
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: true,
      },
    });

    expect(extendedClient.post.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: true,
      },
    });
    expect(result).toEqual({ author: null });
  });

  it("does not manually exclude non-deleted records from boolean toOne include", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    extendedClient.post.update.query.mockImplementation(
      () => Promise.resolve({ author: { deleted: false } }) as any
    );
    const result = await extendedClient.post.update({
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: true,
      },
    });

    expect(extendedClient.post.update.query).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { content: "foo" },
      include: {
        author: true,
      },
    });
    expect(result).toEqual({ author: { deleted: false } });
  });

  it("manually excludes deleted records from toOne include with nested includes", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    extendedClient.post.update.query.mockImplementation(
      () => Promise.resolve({ author: { deleted: true, comments: [] } }) as any
    );

    const result = await extendedClient.post.update({
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

    expect(extendedClient.post.update.query).toHaveBeenCalledWith({
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
    expect(result).toEqual({ author: null });
  });

  it("does not manually exclude non-deleted records from toOne include with nested includes", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    extendedClient.post.update.query.mockImplementation(
      () =>
        Promise.resolve({
          author: {
            deleted: false,
            comments: [],
          },
        }) as any
    );

    const result = await extendedClient.post.update({
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

    expect(result).toEqual({
      author: {
        deleted: false,
        comments: [],
      },
    });
  });

  it("excludes deleted records from toMany include nested in toMany include", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    extendedClient.user.findFirst.query.mockImplementation(
      () =>
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
        }) as any
    );
    const result = await extendedClient.user.findFirst({
      where: { id: 1 },
      include: {
        posts: {
          include: {
            comments: true,
          },
        },
      },
    });

    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        posts: {
          include: {
            comments: {
              where: {
                deleted: false,
              },
            },
          },
        },
      },
    });
    expect(result).toEqual({
      posts: [
        { comments: [{ deleted: false }] },
        { comments: [{ deleted: false }, { deleted: false }] },
      ],
    });
  });

  it("manually excludes deleted records from toOne include nested in toMany include", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    extendedClient.user.findFirst.query.mockImplementation(
      () =>
        Promise.resolve({
          posts: [
            { author: null },
            { author: { deleted: true } },
            { author: { deleted: false } },
          ],
        }) as any
    );

    const result = await extendedClient.user.findFirst({
      where: { id: 1, deleted: false },
      include: {
        posts: {
          include: {
            author: true,
          },
        },
      },
    });

    expect(extendedClient.user.findFirst.query).toHaveBeenCalledWith({
      where: { id: 1, deleted: false },
      include: {
        posts: {
          include: {
            author: true,
          },
        },
      },
    });
    expect(result).toEqual({
      posts: [
        { author: null },
        { author: null },
        { author: { deleted: false } },
      ],
    });
  });

  it("allows explicitly including deleted records using include", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Comment: true },
      })
    );

    extendedClient.user.update.query.mockImplementation(
      () =>
        Promise.resolve({
          comments: [{ deleted: true }, { deleted: true }],
        }) as any
    );
    const result = await extendedClient.user.update({
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

    // params have not been modified
    expect(extendedClient.user.update.query).toHaveBeenCalledWith({
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
    expect(result).toEqual({
      comments: [{ deleted: true }, { deleted: true }],
    });
  });
});
