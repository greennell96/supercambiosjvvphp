<?php
// Load credentials (gitignored db-config.php, one level up from bat/)
$_dbConfig = isset($_SERVER['DOCUMENT_ROOT'])
    ? dirname($_SERVER['DOCUMENT_ROOT']) . '/db-config.php'
    : dirname(__DIR__) . '/db-config.php';
if (file_exists($_dbConfig)) require_once $_dbConfig;

// Initiate the autoloader.
require_once 'ReCaptcha/autoload.php';

// Keys live in db-config.php (gitignored) — never hardcode here
$siteKey = defined('RECAPTCHA_SITE_KEY') ? RECAPTCHA_SITE_KEY : '';
$secret  = defined('RECAPTCHA_SECRET')   ? RECAPTCHA_SECRET   : '';

// reCAPTCHA supported 40+ languages listed here: https://developers.google.com/recaptcha/docs/language
$lang = 'en';

// If No key
if ($siteKey === '' || $secret === ''):
  die('CPT001');
elseif (isset($_POST['g-recaptcha-response'])):

  // If the form submission includes the "g-captcha-response" field
  // Create an instance of the service using your secret
  $recaptcha = new \ReCaptcha\ReCaptcha($secret);

  // Make the call to verify the response and also pass the user's IP address
  $resp = $recaptcha->verify($_POST['g-recaptcha-response'], $_SERVER['REMOTE_ADDR']);

  if ($resp->isSuccess()):
    // If the response is a success, that's it!
    die('CPT000');
  else:
    // Something wrong
    die('CPT002');
  endif;

endif;
?>
