#!/bin/sh
# Downloads the 13 Fish Audio drama-3 clips into ./audio so index.html works fully offline.
cd "$(dirname "$0")"; mkdir -p audio
curl -fL -o audio/01.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/e64e72ae6525467daabee31c92c51d06.mp3"
curl -fL -o audio/02.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/82a377d0816d4b61b241c3c56993d204.mp3"
curl -fL -o audio/03.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/4a93115ed548412abe9b67df76a020c6.mp3"
curl -fL -o audio/04.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/62bdb3f2336d45d0b34d9b5ff0065166.mp3"
curl -fL -o audio/05.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/353a129c2226477db1de5eff43e67f66.mp3"
curl -fL -o audio/06.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/d84fbfd857fe4d93b4b0fa42c8f3cbbb.mp3"
curl -fL -o audio/07.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/f87de43a28554eadb64d47fb938ea91e.mp3"
curl -fL -o audio/08.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/dbc80344549e43768f5d9dfd4d359b16.mp3"
curl -fL -o audio/09.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/23afea1463364b25a2f7dd776ceaac88.mp3"
curl -fL -o audio/10.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/b5ea8a86326c49caa4bdda50686cef6f.mp3"
curl -fL -o audio/11.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/29349114394d47fc8dcc7b63514869cb.mp3"
curl -fL -o audio/12.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/78ca0d96317241c2b728e9b914dbdcac.mp3"
curl -fL -o audio/13.mp3 "https://platform.r2.fish.audio/tasks/2026-11-14/f178ae6555a64ea79fae0fc3ae81d454.mp3"
