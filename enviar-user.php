<?php
session_start();
ob_start();

// rate-limit simples (5 segundos)
$agora = time();
if (isset($_SESSION['ultimo_envio']) && ($agora - $_SESSION['ultimo_envio']) < 5) {
    http_response_code(204);
    exit;
}
$_SESSION['ultimo_envio'] = $agora;

// e-mail destinatário
$email_vegas = "teste@gmail.com";

require("./PHPMailer.php");
require("./SMTP.php");

use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json');

// apenas POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Requisição inválida.']);
    exit;
}

// helper para obter POST com fallback e sanitização
function post($key, $fallback = '') {
    if (!isset($_POST[$key])) return $fallback;
    return trim((string) $_POST[$key]);
}

// campos do formulário (iguais aos do seu HTML)
$contato_nome     = post('contato_nome');
$nome_empresa     = post('nome_empresa');
$contato_telefone = post('contato_telefone');
$contato_email    = post('contato_email');
$beneficio        = post('beneficio');
$aceite_termos    = isset($_POST['aceite_termos']) && $_POST['aceite_termos'] ? true : false;

// validação mínima
if (!$contato_nome || !$contato_email || !$aceite_termos) {
    echo json_encode([
        'success' => false,
        'message' => 'Preencha os campos obrigatórios (Nome, E-mail) e aceite os Termos.'
    ]);
    exit;
}

// monta corpo do e-mail
$corpo = "
  <h2>Novo contato via formulário de parceria</h2>

  <h3>Dados de Contato</h3>
  <p>
    <strong>Nome:</strong> " . htmlspecialchars($contato_nome) . "<br>
    <strong>Telefone:</strong> " . htmlspecialchars($contato_telefone ?: '(não informado)') . "<br>
    <strong>Email:</strong> " . htmlspecialchars($contato_email) . "
  </p>

  <h3>Empresa</h3>
  <p>
    <strong>Nome da Empresa:</strong> " . htmlspecialchars($nome_empresa ?: '(não informado)') . "
  </p>

  <h3>Mensagem</h3>
  <p>" . nl2br(htmlspecialchars($beneficio ?: '(sem mensagem)')) . "</p>
";

// assunto
$subjectEmpresa = $nome_empresa ? $nome_empresa : $contato_nome;

// configura PHPMailer
$mail = new PHPMailer();
$mail->isSMTP();
$mail->SMTPDebug  = 0;
$mail->SMTPAuth   = true;
$mail->SMTPSecure = 'ssl';
$mail->Host       = "smtp.gmail.com";
$mail->Port       = 465;
$mail->Username   = ""; // inserir login SMTP
$mail->Password   = ""; // inserir senha SMTP
$mail->isHTML(true);

$mail->setFrom($email_vegas, "Formulário de Contato");
$mail->addReplyTo($contato_email ?: $email_vegas, $contato_nome ?: "Contato");
$mail->Subject = "Contato de Parceria: {$subjectEmpresa}";
$mail->Body    = $corpo;
$mail->addAddress($email_vegas);

// tenta enviar
if (!$mail->send()) {
    echo json_encode(['success' => false, 'message' => "Erro ao enviar: " . $mail->ErrorInfo]);
} else {
    echo json_encode(['success' => true, 'message' => "Mensagem enviada com sucesso!"]);
}
exit;
?>
