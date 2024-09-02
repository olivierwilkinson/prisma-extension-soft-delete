import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("findUnique", () => {
  it("does not change findUnique params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.findUnique({
      where: { id: 1 },
    });

    // params have not been modified
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("does not modify findUnique results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { id: 1, deleted: true };
    client.user.findFirst.mockImplementation(
      () => Promise.resolve(queryResult) as any
    );

    const result = await extendedClient.user.findUnique({
      where: { id: 1 },
    });

    expect(result).toEqual(queryResult);
  });

  it("changes findUnique into findFirst and excludes deleted records", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findUnique({
      where: { id: 1 },
    });

    // params have been modified
    expect(client.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
    expect(client.user.findUnique).not.toHaveBeenCalled();
  });

  it("allows explicitly querying for deleted records using findUnique", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findUnique({
      where: { id: 1, deleted: true },
    });

    // params have not been modified
    expect(client.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: true,
      },
    });
    expect(client.user.findUnique).not.toHaveBeenCalled();
  });

  it("throws when trying to pass a findUnique where with a compound unique index field", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await expect(
      extendedClient.user.findUnique({
        where: {
          name_email: {
            name: "test",
            email: "test@test.com",
          },
        },
      })
    ).rejects.toThrowError(
      `prisma-extension-soft-delete: query of model "User" through compound unique index field "name_email" found. Queries of soft deleted models through a unique index are not supported. Set "allowCompoundUniqueIndexWhere" to true to override this behaviour.`
    );
  });

  it('does not modify findUnique when compound unique index field used and "allowCompoundUniqueIndexWhere" is set to true', async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: {
          User: {
            field: "deleted",
            createValue: Boolean,
            allowCompoundUniqueIndexWhere: true,
          },
        },
      })
    );

    await extendedClient.user.findUnique({
      where: {
        name_email: {
          name: "test",
          email: "test@test.com",
        },
      },
    });

    // params have not been modified
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: {
        name_email: {
          name: "test",
          email: "test@test.com",
        },
      },
    });
    expect(client.user.findFirst).not.toHaveBeenCalled();
  });

  it("does not modify findUnique to be a findFirst when no args passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    // @ts-expect-error testing if user doesn't pass args accidentally
    await extendedClient.user.findUnique(undefined);

    // params have not been modified
    expect(client.user.findUnique).toHaveBeenCalledWith(undefined);
    expect(client.user.findFirst).not.toHaveBeenCalled();
  });

  it("does not modify findUnique to be a findFirst when invalid where passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    // @ts-expect-error testing if user doesn't pass where accidentally
    await extendedClient.user.findUnique({});
    expect(client.user.findUnique).toHaveBeenCalledWith({});
    client.user.findUnique.mockClear();

    // expect empty where not to modify params
    // @ts-expect-error testing if user passes where without unique field
    await extendedClient.user.findUnique({ where: {} });
    expect(client.user.findUnique).toHaveBeenCalledWith({ where: {} });
    client.user.findUnique.mockClear();

    // expect where with undefined id field not to modify params
    await extendedClient.user.findUnique({ where: { id: undefined } });
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { id: undefined },
    });
    client.user.findUnique.mockClear();

    // expect where with undefined unique field not to modify params
    await extendedClient.user.findUnique({ where: { email: undefined } });
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { email: undefined },
    });
    client.user.findUnique.mockClear();

    // expect where with undefined unique index field not to modify params
    await extendedClient.user.findUnique({ where: { name_email: undefined } });
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { name_email: undefined },
    });
    client.user.findUnique.mockClear();

    // expect where with defined non-unique field
    // @ts-expect-error intentionally incorrect where
    await extendedClient.user.findUnique({ where: { name: "test" } });
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { name: "test" },
    });
    client.user.findUnique.mockClear();

    // expect where with defined non-unique field and undefined id field not to modify params
    await extendedClient.user.findUnique({
      where: { id: undefined, name: "test" },
    });
    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { id: undefined, name: "test" },
    });
  });
});
