export function buildJoinLink(pathname: string, origin: string) {
  const joinPath = pathname.replace(/^\/rooms(\/|$)/, '/enter$1');
  return new URL(joinPath, origin).toString();
}
