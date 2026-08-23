<?php
/**
 * 下部CTA。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_args = wp_parse_args(
	isset( $args ) ? $args : array(),
	array(
		'title' => '似合うを、いっしょに見つけませんか。',
		'body'  => '所要時間や料金のご相談だけでも構いません。まずはお気軽にお問い合わせください。',
	)
);

$bp_instagram = bp_option( 'bp_instagram' );
?>
<section class="bp-cta">
	<div class="bp-container">
		<p class="ornament-line"><span>RESERVATION</span></p>
		<h2 class="section-title reveal"><?php echo esc_html( $bp_args['title'] ); ?></h2>
		<p class="section-subtitle reveal"><?php echo esc_html( $bp_args['body'] ); ?></p>
		<div class="btn-row btn-row--center reveal">
			<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>">ご予約フォームへ</a>
			<?php if ( $bp_instagram ) : ?>
				<a class="btn-outline" href="<?php echo esc_url( $bp_instagram ); ?>" target="_blank" rel="noopener noreferrer">Instagramを見る</a>
			<?php endif; ?>
		</div>
	</div>
</section>
