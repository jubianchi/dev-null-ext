import { ApiError } from '@dev-null-ext/client';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type FollowCache, type FollowClient, Follows } from '../src/lib/follows.ts';

const me = { id: 'me', handle: 'jubianchi', name: null, avatar_url: null, bio: null, github_url: '', html_url: '', terms_accepted: true };

let now: number;
let stored: FollowCache | null;
let api: {
  followingHandles: Mock<FollowClient['followingHandles']>;
  follow: Mock<FollowClient['follow']>;
  unfollow: Mock<FollowClient['unfollow']>;
  followsOrganization: Mock<FollowClient['followsOrganization']>;
  followOrganization: Mock<FollowClient['followOrganization']>;
  unfollowOrganization: Mock<FollowClient['unfollowOrganization']>;
};
let user: typeof me | null;

function follows() {
  return new Follows({
    client: async () => api,
    me: async () => user,
    store: {
      get: async () => stored,
      set: async (cache) => {
        stored = cache;
      },
    },
    now: () => now,
  });
}

beforeEach(() => {
  now = 1_000_000;
  stored = null;
  user = me;
  api = {
    followingHandles: vi.fn<FollowClient['followingHandles']>(async () => new Set(['taylorotwell'])),
    follow: vi.fn<FollowClient['follow']>(async () => undefined),
    unfollow: vi.fn<FollowClient['unfollow']>(async () => undefined),
    followsOrganization: vi.fn<FollowClient['followsOrganization']>(async () => false),
    followOrganization: vi.fn<FollowClient['followOrganization']>(async () => undefined),
    unfollowOrganization: vi.fn<FollowClient['unfollowOrganization']>(async () => undefined),
  };
});

describe('Follows', () => {
  it('tells who the user follows, from their following list, and who they are', async () => {
    const states = await follows().states(['TaylorOtwell', 'A5hleyRich', 'JUBIANCHI']);

    expect(states).toEqual({ TaylorOtwell: 'following', A5hleyRich: 'not-following', JUBIANCHI: 'self' });
    expect(api.followingHandles).toHaveBeenCalledWith('jubianchi');
  });

  it('tells nothing when the user is signed out', async () => {
    user = null;

    expect(await follows().states(['taylorotwell'])).toBeNull();
    expect(api.followingHandles).not.toHaveBeenCalled();
  });

  it('loads the following list once for a while, across background restarts', async () => {
    await follows().states(['taylorotwell']);
    now += 9 * 60_000;
    await follows().states(['a5hleyrich']);

    expect(api.followingHandles).toHaveBeenCalledTimes(1);
  });

  it('loads it once for concurrent questions', async () => {
    const book = follows();
    await Promise.all([book.states(['taylorotwell']), book.states(['a5hleyrich'])]);

    expect(api.followingHandles).toHaveBeenCalledTimes(1);
  });

  it('loads it again once it is stale, or for another user', async () => {
    await follows().states(['taylorotwell']);
    now += 11 * 60_000;
    await follows().states(['taylorotwell']);
    user = { ...me, handle: 'someone-else' };
    await follows().states(['taylorotwell']);

    expect(api.followingHandles).toHaveBeenCalledTimes(3);
  });

  it('follows and unfollows, keeping the list up to date without loading it again', async () => {
    const book = follows();

    expect(await book.set('A5hleyRich', true)).toBe('following');
    expect(api.follow).toHaveBeenCalledWith('A5hleyRich');
    expect(await follows().states(['a5hleyrich'])).toEqual({ a5hleyrich: 'following' });

    expect(await book.set('TaylorOtwell', false)).toBe('not-following');
    expect(api.unfollow).toHaveBeenCalledWith('TaylorOtwell');
    expect(await follows().states(['taylorotwell'])).toEqual({ taylorotwell: 'not-following' });

    expect(api.followingHandles).toHaveBeenCalledTimes(1);
  });

  it("remembers who isn't on /dev/null, from the 404 a follow gets, so as not to offer them again", async () => {
    api.follow.mockRejectedValueOnce(new ApiError(404, null, 'Not found.'));

    expect(await follows().set('nobody', true)).toBe('absent');
    expect(await follows().states(['Nobody'])).toEqual({ Nobody: 'absent' });
  });

  it("lets the other errors through, as a block's 403", async () => {
    api.follow.mockRejectedValueOnce(new ApiError(403, null, 'This action is unauthorized.'));

    await expect(follows().set('blocked', true)).rejects.toMatchObject({ status: 403 });
    expect(await follows().states(['blocked'])).toEqual({ blocked: 'not-following' });
  });
});

describe('Follows, organizations', () => {
  it('tells whether the user follows an organization, from its page on /dev/null', async () => {
    api.followsOrganization.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect(await follows().organizationState('laravel')).toBe('following');
    expect(await follows().organizationState('NativePHP')).toBe('not-following');
    expect(api.followsOrganization).toHaveBeenCalledWith('laravel');
  });

  it("says an organization /dev/null has no page for isn't on it", async () => {
    api.followsOrganization.mockRejectedValueOnce(new ApiError(404, null, 'Not Found'));

    expect(await follows().organizationState('nobody')).toBe('absent');
  });

  it('tells nothing when the user is signed out', async () => {
    user = null;

    expect(await follows().organizationState('laravel')).toBeNull();
    expect(api.followsOrganization).not.toHaveBeenCalled();
  });

  it('follows and unfollows an organization, and says when it is not on /dev/null', async () => {
    expect(await follows().setOrganization('laravel', true)).toBe('following');
    expect(api.followOrganization).toHaveBeenCalledWith('laravel');
    expect(await follows().setOrganization('laravel', false)).toBe('not-following');
    expect(api.unfollowOrganization).toHaveBeenCalledWith('laravel');

    api.followOrganization.mockRejectedValueOnce(new ApiError(404, null, 'Not Found'));
    expect(await follows().setOrganization('nobody', true)).toBe('absent');
  });
});
