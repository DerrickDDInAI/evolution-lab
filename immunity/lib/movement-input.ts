const movementKeys=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright']);
type KeyInput={key:string;shiftKey:boolean;repeat?:boolean};
// Direction taps survive a render interval; sprint is a held modifier only.
// Every keyboard event also repairs a missed Shift release (e.g. OS shortcuts).
export function movementKey(keys:Set<string>,taps:Set<string>,event:KeyInput,pressed:boolean){
  const key=event.key.toLowerCase();
  taps.delete('shift');
  if(!event.shiftKey)keys.delete('shift');
  if(key==='shift'){
    if(event.shiftKey&&(!pressed||!event.repeat||keys.has('shift')))keys.add('shift');
    return true;
  }
  if(!pressed){keys.delete(key);return movementKeys.has(key);}
  if(!movementKeys.has(key)||event.repeat&&!keys.has(key))return false;
  if(!keys.has(key))taps.add(key);
  keys.add(key);return true;
}
