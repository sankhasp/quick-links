// Global chrome API mock for all tests
global.chrome = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      onChanged: { addListener: vi.fn() },
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
  },
  contextMenus: {
    create: vi.fn(),
    update: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  scripting: {
    executeScript: vi.fn(),
  },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})
