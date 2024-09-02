import { createSoftDeleteExtension } from "../../src";
import { MockClient } from "./utils/mockClient";

describe("findUniqueOrThrow", () => {
  it("does not change findUniqueOrThrow params if model is not in the list", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: {} })
    );

    await extendedClient.user.findUniqueOrThrow({
      where: { id: 1 },
    });

    // params have not been modified
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("does not modify findUniqueOrThrow results", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({ models: { User: true } })
    );

    const queryResult = { id: 1, deleted: true };
    client.user.findFirstOrThrow.mockImplementation(
      () => Promise.resolve(queryResult) as any
    );

    const result = await extendedClient.user.findUniqueOrThrow({
      where: { id: 1 },
    });

    expect(result).toEqual({ id: 1, deleted: true });
  });

  it("changes findUniqueOrThrow into findFirstOrThrow and excludes deleted records", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findUniqueOrThrow({
      where: { id: 1 },
    });

    // params have been modified
    expect(client.user.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: false,
      },
    });
    expect(client.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("allows explicitly querying for deleted records using findUniqueOrThrow", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    await extendedClient.user.findUniqueOrThrow({
      where: { id: 1, deleted: true },
    });

    // params have not been modified
    expect(client.user.findFirstOrThrow).toHaveBeenCalledWith({
      where: {
        id: 1,
        deleted: true,
      },
    });
    expect(client.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("does not modify findUniqueOrThrow to be a findFirstOrThrow when no args passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    // @ts-expect-error testing if user doesn't pass args accidentally
    await extendedClient.user.findUniqueOrThrow(undefined);

    // params have not been modified
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith(undefined);
  });

  it("does not modify findUniqueOrThrow to be a findFirst when invalid where passed", async () => {
    const client = new MockClient();
    const extendedClient = client.$extends(
      createSoftDeleteExtension({
        models: { User: true },
      })
    );

    // @ts-expect-error testing if user doesn't pass where accidentally
    await extendedClient.user.findUniqueOrThrow({});
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({});
    client.user.findUniqueOrThrow.mockClear();

    // expect empty where not to modify params
    // @ts-expect-error testing if user passes where without unique field
    await extendedClient.user.findUniqueOrThrow({ where: {} });
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({ where: {} });
    client.user.findUniqueOrThrow.mockClear();

    // expect where with undefined id field not to modify params
    await extendedClient.user.findUniqueOrThrow({ where: { id: undefined } });
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: undefined },
    });
    client.user.findUniqueOrThrow.mockClear();

    // expect where with undefined unique field not to modify params
    await extendedClient.user.findUniqueOrThrow({
      where: { email: undefined },
    });
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { email: undefined },
    });
    client.user.findUniqueOrThrow.mockClear();

    // expect where with undefined unique index field not to modify params
    await extendedClient.user.findUniqueOrThrow({
      where: { name_email: undefined },
    });
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { name_email: undefined },
    });
    client.user.findUniqueOrThrow.mockClear();

    // expect where with defined non-unique field
    // @ts-expect-error intentionally incorrect where
    await extendedClient.user.findUniqueOrThrow({ where: { name: "test" } });
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { name: "test" },
    });
    client.user.findUniqueOrThrow.mockClear();

    // expect where with defined non-unique field and undefined id field not to modify params
    await extendedClient.user.findUniqueOrThrow({
      where: { id: undefined, name: "test" },
    });
    expect(client.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: undefined, name: "test" },
    });
  });
});
