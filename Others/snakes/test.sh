clang -fsanitize=address -lncurses short_snake.c -g
./a.out 2>a
cat a
