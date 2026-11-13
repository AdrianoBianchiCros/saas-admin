<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

// Na HostGator o Laravel fica fora da pasta pública, em /home4/adri0667/saas/admin.
define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../../../saas/admin/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../../../saas/admin/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../../../saas/admin/bootstrap/app.php';

$app->handleRequest(Request::capture());
