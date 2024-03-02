import faker from "faker";

import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("where", () => {
  it("does not change where action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.deleteMany({
      where: {
        email: faker.internet.email(),
        comments: {
          some: {
            content: faker.lorem.sentence(),
          },
        },
      },
    });

    // params have not been modified
    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        email: expect.any(String),
        comments: {
          some: {
            content: expect.any(String),
          },
        },
      },
    });
  });

  it("changes root where correctly when model is nested", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { Comment: true } })
    );

    await extendedClient.user.deleteMany({
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

    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        email: expect.any(String),
        comments: {
          some: {
            deleted: false,
            AND: [
              { createdAt: { gt: expect.any(Date) } },
              { createdAt: { lt: expect.any(Date) } },
            ],
            OR: [
              { post: { content: expect.any(String) } },
              { post: { content: expect.any(String) } },
            ],
            NOT: { post: { is: { authorName: expect.any(String) } } },
            content: expect.any(String),
            post: {
              isNot: {
                content: expect.any(String),
              },
            },
          },
        },
      },
    });
  });

  it("handles where with modifiers correctly", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { Post: true, Comment: true, User: true },
      })
    );

    await extendedClient.comment.findMany({
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

    expect(client.comment.findMany).toHaveBeenCalledWith({
      where: {
        deleted: false,
        content: expect.any(String),
        post: {
          is: {
            content: expect.any(String),
            deleted: false,
          },
        },
        author: {
          isNot: {
            name: expect.any(String),
            deleted: false,
          },
        },
        replies: {
          some: {
            content: expect.any(String),
            deleted: false,
          },
          every: {
            OR: [{ deleted: { not: false } }, { content: expect.any(String) }],
          },
          none: {
            content: expect.any(String),
            deleted: false,
          },
        },
      },
    });
  });

  it("changes root where correctly when model is deeply nested", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { Post: true } })
    );

    await extendedClient.user.deleteMany({
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

    // params have been modified
    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        email: expect.any(String),
        comments: {
          some: {
            AND: [
              { createdAt: { gt: expect.any(Date) } },
              {
                post: {
                  deleted: false,
                  content: expect.any(String),
                },
              },
            ],
            OR: [
              {
                post: {
                  content: expect.any(String),
                  deleted: false,
                },
              },
              { createdAt: { lt: expect.any(Date) } },
            ],
            NOT: {
              post: {
                is: {
                  deleted: false,
                  authorName: expect.any(String),
                },
              },
            },
            post: {
              isNot: {
                content: expect.any(String),
                deleted: false,
              },
            },
          },
        },
      },
    });
  });

  it("change root where correctly when multiple models passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    await extendedClient.user.deleteMany({
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

    // params have been modified
    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        email: expect.any(String),
        comments: {
          some: {
            deleted: false,
            AND: [
              { createdAt: { gt: expect.any(Date) } },
              { createdAt: { lt: expect.any(Date) } },
            ],
            OR: [
              { post: { deleted: false, content: expect.any(String) } },
              { post: { deleted: false, content: expect.any(String) } },
            ],
            NOT: {
              post: { is: { deleted: false, authorName: expect.any(String) } },
            },
            content: expect.any(String),
            post: {
              isNot: {
                deleted: false,
                content: expect.any(String),
              },
            },
          },
        },
      },
    });
  });

  it("allows checking for deleted records explicitly", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    await extendedClient.user.deleteMany({
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

    expect(client.user.deleteMany).toHaveBeenCalledWith({
      where: {
        email: expect.any(String),
        comments: {
          some: {
            deleted: true,
            AND: [
              { createdAt: { gt: expect.any(Date) } },
              { createdAt: { lt: expect.any(Date) } },
            ],
            OR: [
              { post: { deleted: true, content: expect.any(String) } },
              { post: { deleted: false, content: expect.any(String) } },
            ],
            NOT: {
              post: { is: { deleted: true, authorName: expect.any(String) } },
            },
            content: expect.any(String),
            post: {
              isNot: {
                deleted: false,
                content: expect.any(String),
              },
            },
            replies: {
              some: {
                content: expect.any(String),
                deleted: true,
              },
              every: {
                content: expect.any(String),
                deleted: true,
              },
              none: {
                content: expect.any(String),
                deleted: true,
              },
            },
          },
        },
      },
    });
  });

  it("excludes deleted from include where with nested relations", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
        },
      })
    );

    await extendedClient.user.findMany({
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

    expect(client.user.findMany).toHaveBeenCalledWith({
      include: {
        posts: {
          where: {
            comments: {
              some: {
                deleted: false,
                content: expect.any(String),
              },
            },
          },
        },
      },
    });
  });

  it("excludes deleted from select where with nested relations", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
        },
      })
    );

    await extendedClient.user.findMany({
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

    expect(client.user.findMany).toHaveBeenCalledWith({
      select: {
        posts: {
          where: {
            comments: {
              some: {
                deleted: false,
                content: expect.any(String),
              },
            },
          },
        },
      },
    });
  });

  it("excludes deleted from include where with nested relations and multiple models", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    await extendedClient.user.findMany({
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

    expect(client.user.findMany).toHaveBeenCalledWith({
      include: {
        comments: {
          where: {
            deleted: false,
            post: {
              deleted: false,
              content: expect.any(String),
              comments: {
                some: {
                  deleted: false,
                  content: expect.any(String),
                },
              },
            },
          },
        },
      },
    });
  });

  it("excludes deleted from select where with nested relations and multiple models", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          Comment: true,
          Post: true,
        },
      })
    );

    await extendedClient.user.findMany({
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

    expect(client.user.findMany).toHaveBeenCalledWith({
      select: {
        comments: {
          where: {
            deleted: false,
            post: {
              deleted: false,
              content: expect.any(String),
              comments: {
                some: {
                  deleted: false,
                  content: expect.any(String),
                },
              },
            },
          },
        },
      },
    });
  });
});
