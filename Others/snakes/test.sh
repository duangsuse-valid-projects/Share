clang -fsanitize=address -g short_snake.c -lncurses
gdb -ex run ./a.out 2>a
cat a
