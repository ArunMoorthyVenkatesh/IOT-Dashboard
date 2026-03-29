import {
  loginUser, sendOtp, verifyOtp, requestSignup,
  sendResetOtp, resetPassword,
  getAllProjects, getUserAccesses,
  getMyProfile, getStarredProjects, toggleStarredProject,
  getPendingUsers, getPendingAdmins,
  assignUserProjects, removeUserProject,
} from './api';

const BASE = 'http://localhost:8000/api';

// ── fetch mock helpers ────────────────────────────────────────────────────────

function mockOk(body, status = 200) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockError(body, status = 400) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(body),
  });
}

function mockNetworkFailure() {
  global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ── Token injection ───────────────────────────────────────────────────────────

describe('token injection', () => {
  test('injects user token from localStorage', async () => {
    localStorage.setItem('token', 'user-jwt');
    mockOk({ projects: [] });
    await getAllProjects();
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer user-jwt');
  });

  test('prefers adminToken over token', async () => {
    localStorage.setItem('token', 'user-jwt');
    localStorage.setItem('adminToken', 'admin-jwt');
    mockOk({ projects: [] });
    await getAllProjects();
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer admin-jwt');
  });

  test('sends no Authorization header when localStorage is empty', async () => {
    mockOk({ projects: [] });
    await getAllProjects();
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  test('always sets Content-Type: application/json', async () => {
    mockOk({});
    await getAllProjects();
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  test('throws structured error with backend detail message', async () => {
    mockError({ detail: 'Invalid credentials' }, 401);
    await expect(loginUser({ email: 'a@b.com', password: 'x', role: 'user' }))
      .rejects.toMatchObject({ message: 'Invalid credentials', status: 401 });
  });

  test('throws structured error with msg field', async () => {
    mockError({ msg: 'Bad request' }, 400);
    await expect(getAllProjects()).rejects.toMatchObject({ message: 'Bad request', status: 400 });
  });

  test('throws network error with status 0 on connection failure', async () => {
    mockNetworkFailure();
    await expect(getAllProjects()).rejects.toMatchObject({ status: 0 });
  });

  test('returns null for 204 No Content', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 204 });
    const result = await getAllProjects();
    expect(result).toBeNull();
  });
});

// ── Auth endpoints ────────────────────────────────────────────────────────────

describe('loginUser', () => {
  test('POSTs to /login', async () => {
    mockOk({ profile: { email: 'u@t.com' }, token: 'jwt', role: 'user' });
    await loginUser({ email: 'u@t.com', password: 'pass', role: 'user' });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/login`);
    expect(global.fetch.mock.calls[0][1].method).toBe('POST');
  });

  test('sends email, password, and role in body', async () => {
    mockOk({ profile: {}, token: 'jwt', role: 'user' });
    await loginUser({ email: 'u@t.com', password: 'Secret1!', role: 'user' });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ email: 'u@t.com', password: 'Secret1!', role: 'user' });
  });
});

describe('sendOtp', () => {
  test('POSTs email to /otp/send', async () => {
    mockOk({ message: 'OTP sent' });
    await sendOtp('user@test.com');
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/otp/send`);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ email: 'user@test.com' });
  });
});

describe('verifyOtp', () => {
  test('POSTs email and otp to /otp/verify', async () => {
    mockOk({ message: 'OTP verified' });
    await verifyOtp({ email: 'user@test.com', otp: '123456' });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/otp/verify`);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toEqual({ email: 'user@test.com', otp: '123456' });
  });
});

describe('sendResetOtp', () => {
  test('POSTs to /auth/forgot-password/send-otp', async () => {
    mockOk({ message: 'sent' });
    await sendResetOtp({ email: 'user@test.com', role: 'user' });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/auth/forgot-password/send-otp`);
  });
});

describe('resetPassword', () => {
  test('POSTs all fields to /auth/forgot-password/reset', async () => {
    mockOk({ message: 'updated' });
    await resetPassword({ email: 'u@t.com', role: 'user', otp: '123456', new_password: 'New1!', confirm_password: 'New1!' });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/auth/forgot-password/reset`);
    const body = JSON.parse(opts.body);
    expect(body.otp).toBe('123456');
    expect(body.new_password).toBe('New1!');
  });
});

// ── Project endpoints ─────────────────────────────────────────────────────────

describe('getAllProjects', () => {
  test('calls GET /projects', async () => {
    mockOk({ projects: [] });
    await getAllProjects();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/projects`);
    expect(global.fetch.mock.calls[0][1].method).toBeUndefined(); // GET has no explicit method
  });
});

describe('getUserAccesses', () => {
  test('encodes email in query string', async () => {
    mockOk({ user_accesses: [] });
    await getUserAccesses('user+tag@example.com');
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/user-accesses?email=');
    expect(url).toContain(encodeURIComponent('user+tag@example.com'));
  });
});

describe('assignUserProjects', () => {
  test('POSTs email and projectIds to /user-accesses/assign', async () => {
    mockOk({ message: 'updated' });
    await assignUserProjects({ email: 'u@t.com', projectIds: ['P1001', 'P1002'] });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/user-accesses/assign`);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ email: 'u@t.com', projectIds: ['P1001', 'P1002'] });
  });
});

describe('removeUserProject', () => {
  test('POSTs email and projectId to /user-accesses/remove', async () => {
    mockOk({ message: 'removed' });
    await removeUserProject({ email: 'u@t.com', projectId: 'P1001' });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/user-accesses/remove`);
    expect(JSON.parse(opts.body)).toMatchObject({ email: 'u@t.com', projectId: 'P1001' });
  });
});

// ── User endpoints ────────────────────────────────────────────────────────────

describe('getMyProfile', () => {
  test('calls GET /user/me', async () => {
    mockOk({ email: 'u@t.com' });
    await getMyProfile();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/user/me`);
  });
});

describe('getStarredProjects', () => {
  test('calls GET /user/starred', async () => {
    mockOk({ starred: [] });
    await getStarredProjects();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/user/starred`);
  });
});

describe('toggleStarredProject', () => {
  test('POSTs project_id to /user/starred/toggle', async () => {
    mockOk({ starred: ['P1001'] });
    await toggleStarredProject('P1001');
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/user/starred/toggle`);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ project_id: 'P1001' });
  });
});

// ── Admin endpoints ───────────────────────────────────────────────────────────

describe('getPendingUsers', () => {
  test('calls GET /admin/pending-users', async () => {
    mockOk([]);
    await getPendingUsers();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/admin/pending-users`);
  });
});

describe('getPendingAdmins', () => {
  test('calls GET /admin/pending-admins', async () => {
    mockOk([]);
    await getPendingAdmins();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/admin/pending-admins`);
  });
});
