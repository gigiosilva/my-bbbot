SET /P email= Digite seu email da globo: 
SET /P senha= Digite sua senha da globo: 

SET /P voto= Selecione em quem vai vota [1 | 2 | 3] conforme ordem do paredão: 
node src/index.js %email% %senha% %voto%