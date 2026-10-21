type GameStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type StoredKey = 'profile'|'name'|'session';

export function readGameStorage(storage:GameStorage,key:StoredKey){
  const current=storage.getItem(`immunity-${key}`);
  if(current!==null)return current;
  // Keep compatibility with existing tabs and saved anonymous score identities.
  const legacy=storage.getItem(`pursuit-${key}`);
  if(legacy!==null)storage.setItem(`immunity-${key}`,legacy);
  return legacy;
}

export function clearGameSession(storage:GameStorage){
  storage.removeItem('immunity-session');
  storage.removeItem('pursuit-session');
}
