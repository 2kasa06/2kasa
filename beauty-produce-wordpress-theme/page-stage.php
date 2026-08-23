<?php
/**
 * Template Name: ライフステージ別ページ
 * Description: 10代〜20代・30代・40代・50代〜60代などのライフステージ別ページ用テンプレートです。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

while ( have_posts() ) :
	the_post();

	$bp_id          = get_the_ID();
	$bp_range       = get_post_meta( $bp_id, 'bp_age_range', true );
	$bp_range       = $bp_range ? $bp_range : get_the_title();
	$bp_en          = get_post_meta( $bp_id, 'bp_age_en', true );
	$bp_tagline     = get_post_meta( $bp_id, 'bp_age_tagline', true );
	$bp_description = get_post_meta( $bp_id, 'bp_age_description', true );
	$bp_concept     = get_post_meta( $bp_id, 'bp_age_concept', true );
	$bp_subconcept  = get_post_meta( $bp_id, 'bp_age_subconcept', true );
	$bp_pains       = bp_parse_list( get_post_meta( $bp_id, 'bp_age_painpoints', true ) );
	$bp_scenes      = bp_parse_pairs( get_post_meta( $bp_id, 'bp_age_scenes', true ) );
	$bp_services    = (array) get_post_meta( $bp_id, 'bp_age_services', true );
	$bp_accent      = get_post_meta( $bp_id, 'bp_age_accent', true );
	$bp_accent      = $bp_accent ? $bp_accent : 'hsl(8, 40%, 72%)';
	?>

	<section class="bp-page-hero">
		<span class="float-shape animate-float-1"
			style="top:0;right:0;width:600px;height:600px;opacity:.1;transform:translate(20%,-20%);background:radial-gradient(circle, <?php echo esc_attr( $bp_accent ); ?> 0%, transparent 70%);"
			aria-hidden="true"></span>
		<span class="float-shape animate-float-2"
			style="bottom:0;left:0;width:20rem;height:20rem;opacity:.08;transform:translate(-30%,30%);background:radial-gradient(circle, <?php echo esc_attr( $bp_accent ); ?> 0%, transparent 70%);"
			aria-hidden="true"></span>

		<div class="bp-page-hero__media" data-bp-parallax>
			<img src="<?php echo esc_url( bp_age_image_url( $bp_id ) ); ?>" alt="<?php echo esc_attr( $bp_range ); ?>" />
		</div>
		<div class="bp-page-hero__veil" aria-hidden="true"></div>

		<div class="container bp-hero__inner">
			<div class="bp-hero__body">
				<a class="bp-back reveal-left" href="<?php echo esc_url( home_url( '/#age-select' ) ); ?>">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
					ステージ選択に戻る
				</a>

				<?php if ( $bp_en ) : ?>
					<p class="section-label bp-eyebrow reveal-left" style="transition-delay:80ms;"><?php echo esc_html( $bp_en ); ?></p>
				<?php endif; ?>

				<h1 class="bp-page-hero__range reveal-left" style="transition-delay:160ms;"><?php echo esc_html( $bp_range ); ?></h1>

				<?php if ( $bp_tagline ) : ?>
					<p class="bp-page-hero__tagline reveal-left" style="transition-delay:240ms;"><?php echo esc_html( $bp_tagline ); ?></p>
				<?php endif; ?>

				<?php if ( $bp_description ) : ?>
					<p class="bp-page-hero__desc reveal-left" style="transition-delay:340ms;"><?php echo esc_html( $bp_description ); ?></p>
				<?php endif; ?>

				<div class="bp-btn-row reveal-left" style="transition-delay:440ms;">
					<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>">
						無料カウンセリングを予約する
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
					</a>
				</div>
			</div>
		</div>
	</section>

	<?php if ( $bp_pains ) : ?>
		<section class="bp-section" style="background: hsl(42, 35%, 96%); padding-block: 5rem;">
			<div class="container">
				<div class="bp-pain reveal">
					<div class="bp-pain__head">
						<span class="section-label">こんなお悩みはありませんか？</span>
						<?php if ( $bp_concept ) : ?>
							<h2 class="section-title"><?php echo esc_html( $bp_concept ); ?></h2>
						<?php endif; ?>
						<?php if ( $bp_subconcept ) : ?>
							<p class="section-subtitle"><?php echo esc_html( $bp_subconcept ); ?></p>
						<?php endif; ?>
					</div>

					<div class="bp-pain__list">
						<?php foreach ( $bp_pains as $bp_index => $bp_pain ) : ?>
							<div class="bp-pain__item reveal-right" style="transition-delay:<?php echo (int) ( $bp_index * 100 ); ?>ms;">
								<i aria-hidden="true"></i>
								<p><?php echo esc_html( $bp_pain ); ?></p>
							</div>
						<?php endforeach; ?>
					</div>
				</div>
			</div>
		</section>
	<?php endif; ?>

	<?php
	get_template_part(
		'template-parts/section-services',
		null,
		array(
			'ids'      => $bp_services,
			'label'    => 'Services',
			'title'    => '提供サービス',
			'subtitle' => '',
			'anchor'   => 'services',
			'tone'     => 'base',
			'align'    => 'left',
		)
	);
	?>

	<?php if ( $bp_scenes ) : ?>
		<section class="bp-section" style="background: hsl(42, 35%, 96%);">
			<div class="container">
				<div class="bp-head reveal">
					<span class="section-label">Scene Styling</span>
					<h2 class="section-title">シーン別スタイリング</h2>
					<p class="section-subtitle">あらゆるシーンで輝くあなたを演出します。</p>
				</div>

				<div class="bp-grid bp-grid--4">
					<?php foreach ( $bp_scenes as $bp_index => $bp_scene ) : ?>
						<div class="card-glow bp-scene reveal" style="transition-delay:<?php echo (int) ( $bp_index * 100 ); ?>ms;">
							<h3><?php echo esc_html( $bp_scene['title'] ); ?></h3>
							<?php if ( $bp_scene['body'] ) : ?>
								<p><?php echo esc_html( $bp_scene['body'] ); ?></p>
							<?php endif; ?>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>
	<?php endif; ?>

	<?php if ( trim( wp_strip_all_tags( get_the_content() ) ) ) : ?>
		<section class="bp-section bp-section--base">
			<div class="container">
				<div class="bp-narrow bp-entry__content reveal"><?php the_content(); ?></div>
			</div>
		</section>
	<?php endif; ?>

	<?php
	get_template_part( 'template-parts/section-before-after' );
	get_template_part( 'template-parts/section-voice' );
	get_template_part( 'template-parts/section-flow' );
	get_template_part( 'template-parts/section-faq' );
	get_template_part( 'template-parts/section-booking' );

endwhile;

get_footer();
