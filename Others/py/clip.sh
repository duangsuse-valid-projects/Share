clip() {
local host=`ip route list default|awk '{print $3}'` port=12345
if [ "$1" == "to" ]; then
  local s=`xclip -o` n=0
  printf "%s%n\n" $s n; printf "+%d:%s" $n $s|nc -c $host $port
else
  echo '-\x04'|nc $host $port 2>/dev/null|xclip -selection clipboard -in
fi
}
