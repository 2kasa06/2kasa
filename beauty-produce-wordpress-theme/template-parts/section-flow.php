<?php
/**
 * ご利用の流れ。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_steps = array(
	array( '01', 'ご予約', 'フォームまたはInstagramのDMから、ご希望のメニューと日程をお送りください。' ),
	array( '02', 'カウンセリング', 'お悩みとご予定を伺い、当日の進め方をすり合わせます。' ),
	array( '03', '診断・提案', 'ドレープや資料を使いながら、その場で違いを確認していただきます。' ),
	array( '04', 'お渡し・アフター', '結果をまとめた資料をお渡しし、その後のご相談にもお答えします。' ),
);
?>
<section id="flow" class="bp-section bp-section--ivory">
	<div class="bp-container">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label">FLOW</p>
			<h2 class="section-title">ご利用の流れ</h2>
			<p class="section-subtitle">ご予約から結果のお渡しまで、4つのステップで進みます。はじめての方にも、当日の流れを事前にご案内します。</p>
		</div>

		<ol class="bp-grid bp-grid--4 bp-mt-lg">
			<?php foreach ( $bp_steps as $bp_index => $bp_step ) : ?>
				<li class="card-glow bp-flow reveal" style="transition-delay:<?php echo (int) ( $bp_index * 90 ); ?>ms;">
					<span class="bp-flow__step"><?php echo esc_html( $bp_step[0] ); ?></span>
					<h3><?php echo esc_html( $bp_step[1] ); ?></h3>
					<p><?php echo esc_html( $bp_step[2] ); ?></p>
				</li>
			<?php endforeach; ?>
		</ol>
	</div>
</section>
