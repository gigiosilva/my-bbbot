require('dotenv/config');

module.exports = () => {
  const email = process.argv[2] || process.env.EMAIL;
  const password = process.argv[3] || process.env.PASSWORD;
  const victim = process.argv[4] || 2;

  if (email && password && (victim >= 1 && victim <= 3)) {
    return {
      credentials: { email, password },
      victim
    };
  }

  console.log(
    `[❌] Erro: Comando invalido
  Utilize: node src/index.js seu@email.com sua_senha [1 | 2 | 3] de acordo com a ordem do paredão 
  Exemplo: node src/index.js giovani@gmail.com minhasenha123 2`
      .split('\n')
      .map(str => str.trim())
      .join('\n')
  );
  return null;
};