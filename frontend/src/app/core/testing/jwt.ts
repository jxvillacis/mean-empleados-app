// Token con la forma de un JWT para las pruebas: el frontend solo lee exp; la firma la verifica el backend.
export function fakeJwt(expiresInSeconds: number): string {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ id: 'u-1', rol: 'admin', exp })}.firma`;
}
