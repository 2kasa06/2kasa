<?php
/**
 * ブランドメッセージ。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_head = bp_split_lines( bp_option( 'bp_brand_head', "美容サロンではなく、\n「人生をアップデートするブランド」" ) );
?>
<section class="bp-brand">
	<svg class="bp-brand__deco" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
		<circle cx="720" cy="300" r="200" stroke="hsl(8,40%,65%)" stroke-width="0.5" />
		<circle cx="720" cy="300" r="350" stroke="hsl(8,40%,65%)" stroke-width="0.3" />
		<circle cx="720" cy="300" r="500" stroke="hsl(8,40%,65%)" stroke-width="0.2" />
		<path d="M 0 300 Q 360 200 720 300 T 1440 300" stroke="hsl(8,40%,65%)" stroke-width="0.5" fill="none" />
	</svg>

	<span class="float-shape animate-float-1" style="top:2rem;right:6rem;width:12rem;height:12rem;background:hsl(8,40%,65%);opacity:.2;" aria-hidden="true"></span>
	<span class="float-shape animate-float-3" style="bottom:2rem;left:4rem;width:8rem;height:8rem;background:hsl(8,50%,88%);opacity:.15;" aria-hidden="true"></span>

	<div class="container">
		<div class="bp-brand__inner reveal">
			<svg class="bp-brand__mark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M12 3 13.9 8.1 19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
				<path d="M19 15.5 19.8 17.7 22 18.5l-2.2.8L19 21.5l-.8-2.2L16 18.5l2.2-.8z" />
			</svg>

			<h2>
				<?php echo esc_html( $bp_head['first'] ); ?>
				<?php if ( $bp_head['em'] ) : ?>
					<br /><em><?php echo esc_html( $bp_head['em'] ); ?></em>
				<?php endif; ?>
			</h2>

			<p><?php echo nl2br( esc_html( bp_option( 'bp_brand_body', "自分に本当に似合うものを知り、自分自身をアップデートする体験。
外見だけでなく、内側から湧き出る自信と魅力を育みます。" ) ) ); ?></p>

			<p class="ornament-line"><span><?php echo esc_html( bp_option( 'bp_ornament', 'Your Story Begins Here' ) ); ?></span></p>
		</div>
	</div>
</section>
