# CINEFLIX VIP — backend (ainda não publicado)

Estas funções vinculam um PIN **obrigatório de exatamente 8 números** ao UID de quem fez login com Google.

- `vipStatus`: consulta assinatura válida e existência do PIN.
- `vipCreatePin`: permite criar PIN somente após assinatura já validada no servidor.
- `vipVerifyPin`: compara um hash scrypt, com sal aleatório e bloqueio temporário após 5 erros.
- Somente o **servidor** deve gravar `vipSubscriptions/{uid}`. O cliente não pode criar, prorrogar ou ativar o próprio VIP.
- **Sem integração com o Mercado Pago ainda**. Não liberar acesso pela URL de retorno ou pelo cronômetro.
- **Sem recuperação implementada**: não exibir opção de recuperação sem um fluxo de reautenticação seguro.
- Não expor arquivos de funções ao público via GitHub Pages como segredos: este código é público, mas PINs e credenciais nunca devem entrar no repositório.

Para publicar, é necessário configurar Firebase CLI, escolher projeto `prime-flix-ca7aa`, instalar dependências em `functions/` e fazer deploy das Cloud Functions. A hospedagem GitHub Pages sozinha não executa essas funções. Cloud Functions pode exigir habilitar faturamento no Firebase.

**Importante**: testar o fluxo em emulador/ambiente de teste antes de qualquer cobrança.
