<?php
/* ========= HELPERS ========= */
function out($arr, $code=200){ http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function ip(){ if(!empty($_SERVER['HTTP_X_FORWARDED_FOR'])){ return trim(explode(',',$_SERVER['HTTP_X_FORWARDED_FOR'])[0]); } return $_SERVER['REMOTE_ADDR']??'0.0.0.0'; }
function clean($s){ $s=trim((string)$s); $s=preg_replace('/[\x00-\x1F\x7F]/u','',$s); return mb_substr($s,0,200); }
function rate_ok($ip,$dir,$win,$max){
  $k = rtrim($dir,'/').'/rl_'.sha1($ip).'.json'; $now=time(); $d=['ts'=>$now,'count'=>1];
  if (file_exists($k) && ($old=json_decode(@file_get_contents($k),true)) && isset($old['ts'],$old['count']) && $now- (int)$old['ts'] <= $win){ $d=['ts'=>$old['ts'],'count'=>$old['count']+1]; }
  @file_put_contents($k.'.tmp', json_encode($d)); @rename($k.'.tmp',$k);
  return $d['count'] <= $max;
}
function split_name($name){ $parts=preg_split('/\s+/',$name,2)?:[]; return [ $parts[0]??'', $parts[1]??'' ]; }

?>
