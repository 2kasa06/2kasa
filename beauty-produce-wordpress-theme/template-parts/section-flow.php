<?php
/**
 * サービスの流れ。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_steps = array(
	array( '01', '無料カウンセリング', 'お悩みやご希望をじっくりお聴きします。どんな些細なことでもお気軽にご相談ください。', '💬' ),
	array( '02', '診断・分析', 'パーソナルカラー・骨格・顔タイプなど、科学的な手法であなたの魅力を分析します。', '✨' ),
	array( '03', 'プロデュースプラン提案', '診断結果をもとに、あなただけのオーダーメイドプランをご提案します。', '📋' ),
	array( '04', 'アテンド・実践', '実際のショッピングやメイクアップなど、リアルな場でのサポートを行います。', '👗' ),
	array( '05', '撮影・記録', 'プロカメラマンによる撮影で、新しいあなたを美しく記録します。', '📸' ),
);
?>
<section id="flow" class="bp-section bp-section--base">
	<div class="container">
		<div class="bp-head reveal">
			<span class="section-label">How It Works</span>
			<h2 class="section-title">サービスの流れ</h2>
			<p class="section-subtitle">初めての方でも安心してご利用いただけるように、<br />丁寧にサポートいたします。</p>
		</div>

		<div class="bp-flow">
			<ol class="bp-flow__list">
				<?php foreach ( $bp_steps as $bp_index => $bp_step ) : ?>
					<li class="bp-flow__item reveal" style="transition-delay:<?php echo (int) ( $bp_index * 100 ); ?>ms;">
						<span class="bp-flow__num"><?php echo esc_html( $bp_step[0] ); ?></span>
						<div class="card-glow bp-flow__card">
							<header>
								<span aria-hidden="true"><?php echo esc_html( $bp_step[3] ); ?></span>
								<h3><?php echo esc_html( $bp_step[1] ); ?></h3>
							</header>
							<p><?php echo esc_html( $bp_step[2] ); ?></p>
						</div>
					</li>
				<?php endforeach; ?>
			</ol>
		</div>
	</div>
</section>
