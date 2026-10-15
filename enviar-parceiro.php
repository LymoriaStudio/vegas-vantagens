<?php
session_start();
ob_start();

$agora = time();
if (isset($_SESSION['ultimo_envio']) && ($agora - $_SESSION['ultimo_envio']) < 5) {
    http_response_code(204);
    exit;
}
$_SESSION['ultimo_envio'] = $agora;

$email_vegas = "teste@gmail.com";

require("./PHPMailer.php");
require("./SMTP.php");

use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Requisição inválida.']);
    exit;
}

function post($key) { return trim($_POST[$key] ?? ''); }

$razao_social   = post('razao_social');
$nome_fantasia  = post('nome_fantasia');
$cnpj           = post('cnpj');
$segmento       = post('segmento');
$tel_comercial  = post('tel_comercial');

$cep            = post('cep');
$endereco       = post('endereco');
$numero         = post('numero');
$complemento    = post('complemento');
$bairro         = post('bairro');
$cidade         = post('cidade');
$estado         = post('estado');

$contato_nome   = post('contato_nome');
$contato_tel    = post('contato_telefone');
$contato_email  = post('contato_email');
$beneficio      = post('beneficio');
$aceite_termos  = isset($_POST['aceite_termos']);

if (!$contato_nome || !$contato_email || !$razao_social || !$nome_fantasia || !$aceite_termos) {
    echo json_encode([
        'success' => false,
        'message' => 'Preencha os campos obrigatórios e aceite os termos.'
    ]);
    exit;
}

$mail = new PHPMailer();
$mail->isSMTP();
$mail->SMTPDebug  = 0;
$mail->SMTPAuth   = true;
$mail->SMTPSecure = 'ssl';
$mail->Host       = "smtp.gmail.com";
$mail->Port       = 465;
$mail->Username   = ""; //Colocar username
$mail->Password   = ""; //Inserir Senha
$mail->isHTML(true);

$corpo = "
  <h2>Novo cadastro de parceiro</h2>

  <h3>Dados da Empresa</h3>
  <p><strong>Razão Social:</strong> {$razao_social}<br>
  <strong>Nome Fantasia:</strong> {$nome_fantasia}<br>
  <strong>CNPJ:</strong> {$cnpj}<br>
  <strong>Segmento:</strong> {$segmento}<br>
  <strong>Telefone Comercial:</strong> {$tel_comercial}</p>

  <h3>Endereço</h3>
  <p><strong>CEP:</strong> {$cep}<br>
  <strong>Endereço:</strong> {$endereco}, {$numero} {$complemento}<br>
  <strong>Bairro:</strong> {$bairro}<br>
  <strong>Cidade/Estado:</strong> {$cidade} / {$estado}</p>

  <h3>Contato</h3>
  <p><strong>Nome:</strong> {$contato_nome}<br>
  <strong>Telefone:</strong> {$contato_tel}<br>
  <strong>Email:</strong> {$contato_email}</p>

  <h3>Benefício Oferecido</h3>
  <p>" . nl2br(htmlspecialchars($beneficio)) . "</p>
";

$subjectCidade = $cidade ? " - {$cidade}/{$estado}" : "";
$subjectEmpresa = $nome_fantasia ?: $razao_social;



$mail->setFrom($email_vegas, "Formulário Parceiros");
$mail->addReplyTo($contato_email ?: $email_vegas, $contato_nome ?: "Contato");
$mail->Subject = "Novo parceiro: {$subjectEmpresa}{$subjectCidade}";
$mail->Body    = $corpo;
$mail->addAddress($email_vegas);

if (!$mail->send()) {
    echo json_encode(['success' => false, 'message' => "Erro ao enviar: " . $mail->ErrorInfo]);
} else {
    echo json_encode(['success' => true, 'message' => "Dados enviados com sucesso!"]);
}
exit;
