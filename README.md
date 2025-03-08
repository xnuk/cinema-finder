# cinema-finder
보고 싶은 영화를 어디서 언제 상영하는지 알려주는 스크립트. [KOBIS 영화관입장권통합전산망](https://www.kobis.or.kr) 데이터를 사용하고 있습니다.

## build
```sh
pnpm i && pnpm build
```

## run
```console
# node . [지역] [영화명] [날짜 (YYYYMMDD, 생략가능)]

$ node . 영동군 미키 20250306
충청북도 영동군 영동레인보우영화관
미키 17(디지털) (01관): 13:20 15:55 18:30
미키 17(디지털) (02관): 09:45 12:20
```

## [LICENSE](./LICENSE)
BSD-3-Clause
