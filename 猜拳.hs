{-# LANGUAGE UnicodeSyntax #-}

module G猜拳 where
import Data.Either
import Text.Read
import System.IO
import Control.Exception

data G出拳 = C剪刀 | S石头 | F布
  deriving (Enum, Eq)

win :: G出拳 -> G出拳 -> Bool
win C剪刀 F布 = True
win C剪刀 S石头 = False

win S石头 C剪刀 = True
win S石头 F布 = False

win F布 S石头 = True
win F布 C剪刀 = False

deuce :: G出拳 -> G出拳 -> Bool
deuce a b = a == b

instance Read G出拳 where
  readPrec = do
    Ident s <- lexP
    case s of
      "剪刀" -> return C剪刀
      "石头" -> return S石头
      "布"   -> return F布
      _ -> pfail

instance Show G出拳 where
  show C剪刀 = "剪刀"
  show S石头 = "石头"
  show F布   = "布"

main :: IO ()
main = initSeed >>= ((curry loop) True)
  where
    isfail :: Either a b -> IO Bool
    isfail = return . isLeft
    initSeed :: IO Int
    initSeed = do
      frnd <- try (openBinaryFile "/dev/random" ReadMode) :: IO (Either IOException Handle)
      failed <- isfail frnd
      if not failed then
        case frnd
          of (Right h) -> let gseed h = (hGetChar h >>= (return . fromEnum)) in (gseed h)
        else return 0

loop :: (Bool, Int) -> IO ()
loop (ft, rnd) = user >>= (judgedBy bot) >> next
  where
    user = userInput ft
    bot = botInput rnd
    judgedBy = flip judge
    next = loop (False, rnd +1)


userInput :: Bool -> IO G出拳
userInput first = let
  banner = "和机器人猜拳！"
  rest = "（剪刀、石头、布）"
  in putStrLn (if first then banner else rest)
    >> (getLine >>= readIO)

botInput :: Int -> G出拳
botInput seed = if (seed `mod` 2) == 0 then
  C剪刀 else if (seed `mod` 3) == 0 then S石头 else F布

judge :: G出拳 -> G出拳 -> IO ()
judge a b = vs >> putStrLn message
  where
    vs = putStr (">> " ++ show a ++ " vs. " ++ show b)
    message = if (a `deuce` b) then deuced else
      if (a `win` b) then winned else losed
    winned = m "你赢了！"
    losed = m "机器人赢了！"
    deuced = m "平手！"
    m s = " = " ++ s
