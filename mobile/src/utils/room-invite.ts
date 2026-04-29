import * as Linking from 'expo-linking';

const APP_SCHEME = 'mafia-mobile';
const JOIN_ROOM_PATH = 'join-room';
const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildRoomInviteUrl(roomId: string) {
  const normalizedRoomId = roomId.trim();
  return `${APP_SCHEME}://${JOIN_ROOM_PATH}?roomId=${encodeURIComponent(normalizedRoomId)}`;
}

export function extractRoomIdFromInvite(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  if (isRoomId(normalizedValue)) {
    return normalizedValue;
  }

  const parsedRoomId = parseRoomIdFromLink(normalizedValue);
  if (parsedRoomId) {
    return parsedRoomId;
  }

  const roomIdMatch = normalizedValue.match(/[?&]roomId=([^&#]+)/i);
  const matchedRoomId = roomIdMatch?.[1] ? decodeURIComponent(roomIdMatch[1]).trim() : '';
  return isRoomId(matchedRoomId) ? matchedRoomId : null;
}

function parseRoomIdFromLink(value: string) {
  const parsedLink = Linking.parse(value);
  const roomIdFromQuery = firstString(parsedLink.queryParams?.roomId)?.trim();
  if (isRoomId(roomIdFromQuery)) {
    return roomIdFromQuery;
  }

  const pathSegments = parsedLink.path?.split('/').filter(Boolean) ?? [];
  const lastSegment = pathSegments.at(-1)?.trim();
  if (isRoomId(lastSegment)) {
    return lastSegment;
  }

  return null;
}

function firstString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isRoomId(value: string | null | undefined) {
  return Boolean(value && ROOM_ID_PATTERN.test(value));
}
