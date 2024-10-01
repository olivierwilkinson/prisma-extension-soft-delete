import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("groupBy", () => {
  //group by must always have by and order by, else we get an error,
  it("does not change groupBy action if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.groupBy({
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });

    // params have not been modified
    expect(extendedClient.user.groupBy.query).toHaveBeenCalledWith({
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });
  });

  it("does not modify groupBy results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    extendedClient.user.groupBy.query.mockImplementation(
      () => Promise.resolve([{ id: 1, deleted: true }]) as any
    );

    const result = await extendedClient.user.groupBy({
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });

    expect(result).toEqual([{ id: 1, deleted: true }]);
  });

  it("excludes deleted records from groupBy", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.groupBy({
      where: { id: 1 },
      by: ["id"],
      orderBy: {},
    });

    // params have been modified
    expect(extendedClient.user.groupBy.query).toHaveBeenCalledWith({
      by: ["id"],
      orderBy: {},
      where: {
        id: 1,
        deleted: false,
      },
    });
  });

  it("allows explicitly querying for deleted records using groupBy", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.groupBy({
      where: { id: 1, deleted: true },
      by: ["id"],
      orderBy: {},
    });

    // params have not been modified
    expect(extendedClient.user.groupBy.query).toHaveBeenCalledWith({
      by: ["id"],
      orderBy: {},
      where: {
        id: 1,
        deleted: true,
      },
    });
  });
});
